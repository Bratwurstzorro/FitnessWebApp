import test from 'node:test'
import assert from 'node:assert/strict'
import {rangeRecommendation} from './progression.js'

const session={id:'now',started_at:'2026-10-04T10:00:00Z'}
const group=[0,1,2].map(i=>({id:`s${i}`,exercise_id:'ex',set_position:i,target_weight_kg:42,rep_min:6,rep_max:10}))
const dataFor=(reps,rir=null)=>({sessions:[{id:'old',finished_at:'2026-10-02T12:00:00Z',plan_name:'Pull',day_name:'Freitag'}],sets:group.map((s,i)=>({...s,session_id:'old',completed_at:'2026-10-02T11:00:00Z',actual_weight_kg:42,actual_reps:reps[i],rir}))})
const text=advice=>advice.explanation.map(row=>row.title+': '+row.text).join('\n')

test('explanation identifies the exact historical set, date, plan and missing reserve',()=>{
  const data=dataFor([10,9,8])
  const advice=rangeRecommendation(data,session,group,group[1],data.sets[1])
  assert.match(text(advice),/Pull · Freitag · Satz #2: 42 kg × 9 · RIR nicht angegeben/)
  assert.match(text(advice),/2.10.2026/)
  assert.match(text(advice),/Satz #3:.*noch nicht bereit/)
  assert.match(text(advice),/9 \+ 1 Wiederholung = 10/)
  assert.equal(advice.label,'42 kg halten, 10 Wiederholungen versuchen')
})

test('today fatigue is explained as the deciding source even against strong history',()=>{
  const data=dataFor([10,10,10],2)
  const live=group.map(s=>({...s}))
  live[0]={...live[0],completed_at:'today',actual_weight_kg:42,actual_reps:8,rir:null}
  live[1]={...live[1],completed_at:'today',actual_weight_kg:42,actual_reps:5,rir:null}
  const advice=rangeRecommendation(data,session,live,live[2],data.sets[2])
  assert.equal(advice.label,'Auf 40 kg reduzieren, 6 Wiederholungen versuchen')
  assert.match(text(advice),/Satz #1: 42 kg × 8/)
  assert.match(text(advice),/Satz #2: 42 kg × 5/)
  assert.match(text(advice),/5 Wiederholungen liegen unter der Untergrenze 6/)
  assert.equal(advice.reason,'today-reduce')
})

test('reserve zero explains why reaching the upper bound does not yet qualify',()=>{
  const data=dataFor([10,10,10],0)
  const advice=rangeRecommendation(data,session,group,group[0],data.sets[0])
  assert.match(text(advice),/10 Wdh. \+ 0 RIR = 10; nötig: 11/)
  assert.match(text(advice),/10 Wdh. \+ 0 RIR − 1 = 9/)
  assert.equal(advice.label,'42 kg halten, 9 Wiederholungen versuchen')
})

test('increase explanation shows all-set eligibility and conservative 3+ handling',()=>{
  const data=dataFor([8,8,8],3)
  const advice=rangeRecommendation(data,session,group,group[0],data.sets[0])
  assert.equal(advice.reason,'history-increase')
  assert.match(text(advice),/mindestens 3 RIR = mindestens 11/)
  assert.match(text(advice),/Alle Vergleichssätze erfüllen die Steigerungsregel/)
})

test('missing history and entered weight are explained without inventing a comparison',()=>{
  const advice=rangeRecommendation({sets:[],sessions:[]},session,group,group[0],null)
  assert.match(text(advice),/noch kein abgeschlossenes Vergleichstraining/)
  const data=dataFor([10,10,10],2)
  const edited=rangeRecommendation(data,session,group,group[0],data.sets[0],{weight:44,edited:true})
  assert.equal(edited.label,'44 kg halten, 6 Wiederholungen versuchen')
  assert.match(text(edited),/44 kg stehen aktuell/)
  assert.match(text(edited),/keine weitere Erhöhung/)
})

test('today reserve caps the historical rep goal and missing or mixed comparisons are explicit',()=>{
  const data=dataFor([10,10,10],2)
  const live=group.map(s=>({...s}))
  live[0]={...live[0],completed_at:'today',actual_weight_kg:42,actual_reps:8,rir:0}
  const advice=rangeRecommendation(data,session,live,live[1],data.sets[1])
  assert.equal(advice.label,'42 kg halten, 7 Wiederholungen versuchen')
  assert.match(text(advice),/8 Wdh. \+ 0 RIR − 1 = 7/)
  assert.match(text(advice),/niedrigere der beiden Ziele/)
  data.sets.pop()
  const missing=rangeRecommendation(data,session,group,group[0],data.sets[0])
  assert.match(text(missing),/Satz #3: Vergleich fehlt/)
  assert.match(text(missing),/deshalb keine automatische Gewichtserhöhung/)
})
