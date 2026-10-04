import test from 'node:test'
import assert from 'node:assert/strict'
import {exerciseHistory} from './exerciseHistory.js'
import {exerciseGuides,guideForExercise} from './exerciseGuides.js'
const exercise={exercise_id:'plan-a',catalog_exercise_id:'shared',exercise_name:'Rudern'}
const sessions=[{id:'old',finished_at:'2026-09-01T12:00:00Z'},{id:'new',finished_at:'2026-10-01T12:00:00Z'},{id:'active',finished_at:null}]
const row=(id,session_id,weight,reps,extra={})=>({id,session_id,exercise_id:'plan-a',catalog_exercise_id:'shared',exercise_name:'Rudern',set_position:0,exercise_position:0,completed_at:'2026-09-01',actual_weight_kg:weight,actual_reps:reps,...extra})
test('max with ten repetitions is evaluated per set, not per workout maximum',()=>{
  const data={sessions,sets:[row('a','old',80,5),row('b','old', 60,12),row('c','new',65,10),row('d','new',70,9)]}
  const h=exerciseHistory(data,exercise,'active')
  assert.equal(h.count,2);assert.equal(h.maxWeight,80);assert.equal(h.maxTenWeight,65)
  assert.deepEqual(h.workouts.map(s=>s.id),['new','old'])
  assert.deepEqual(h.points.map(s=>s.id),['old','new'])
  assert.equal(h.points[0].weight,(80*5+60*12)/17)
})
test('history excludes unfinished, unconfirmed, invalid and different catalog exercises',()=>{
  const data={sessions,sets:[row('a','active',150,12),row('b','old',150,12,{completed_at:null}),
    row('c','old',200,12,{catalog_exercise_id:'different'}),row('d','new',90,0),
    row('e','new',null,12),row('f','new',-5,12),row('g','new',0,12)]}
  const h=exerciseHistory(data,exercise,'active')
  assert.equal(h.count,1);assert.equal(h.maxWeight,0);assert.equal(h.maxTenWeight,0)
  assert.deepEqual(h.workouts[0].sets.map(s=>s.id),['g'])
})
test('legacy matching and other plan instances merge without duplicate workout counts',()=>{
  const data={sessions,sets:[row('a','old',40,10,{catalog_exercise_id:null}),
    row('b','old',45,10,{exercise_id:'plan-b'}),row('c','new',50,7,{exercise_id:'plan-c'})]}
  const h=exerciseHistory(data,exercise,'active')
  assert.equal(h.count,2);assert.equal(h.points.length,2);assert.equal(h.workouts[1].sets.length,2)
  assert.equal(h.maxTenWeight,45)
  const empty=exerciseHistory({sessions,sets:[]},exercise,'active')
  assert.equal(empty.count,0);assert.equal(empty.maxWeight,null);assert.equal(empty.maxTenWeight,null)
})
test('every current catalog exercise has a specific illustrated guide, unknown names do not guess',()=>{
  assert.equal(Object.keys(exerciseGuides).length,13)
  for(const [name,guide] of Object.entries(exerciseGuides)){
    assert.equal(guideForExercise(' '+name.toLocaleLowerCase('de-DE')+' '),guide)
    assert.ok(guide.kind&&guide.setup.length&&guide.execution.length&&guide.source.startsWith('https://'))
  }
  assert.equal(guideForExercise('Unbekannte Übung'),null)
})
