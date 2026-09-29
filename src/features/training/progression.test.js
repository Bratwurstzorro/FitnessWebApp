import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { previousForSet, recommendation } from './progression.js'

test('uses the latest completed value for the same set, not the saved plan value',()=>{
  const sessions=[{id:'old',started_at:'2026-09-01T10:00:00Z'},{id:'recent',started_at:'2026-09-10T10:00:00Z'}]
  const current={id:'current',started_at:'2026-09-20T10:00:00Z'}
  const set={exercise_id:'press',exercise_name:'Bankdrücken',set_position:1}
  const sets=[
    {id:'a',session_id:'old',exercise_id:'press',exercise_name:'Bankdrücken',set_position:1,actual_weight_kg:65,actual_reps:10,completed_at:'2026-09-01T10:10:00Z'},
    {id:'b',session_id:'recent',exercise_id:'press',exercise_name:'Bankdrücken',set_position:0,actual_weight_kg:90,actual_reps:8,completed_at:'2026-09-10T10:10:00Z'},
    {id:'c',session_id:'recent',exercise_id:'press',exercise_name:'Bankdrücken',set_position:1,actual_weight_kg:72.5,actual_reps:11,completed_at:'2026-09-10T10:15:00Z'},
  ]
  const previous=previousForSet(sets,sessions,current,set)
  assert.equal(previous.id,'c')
  assert.equal(recommendation(previous,10,60).weight,72.5)
  assert.match(recommendation(previous,10,60).label,/12 Wiederholungen versuchen/)
})

test('recommends a modest increase only after exceeding the target',()=>{
  assert.match(recommendation({actual_weight_kg:50,actual_reps:12},10,45).label,/51–52,5 kg mit 10 Wiederholungen prüfen/)
  assert.match(recommendation({actual_weight_kg:50,actual_reps:8},10,45).label,/50 kg halten, 9 Wiederholungen versuchen/)
  assert.equal(recommendation(null,10,45).weight,45)
})

test('uses the shared exercise ID across plans and never mixes distinct catalog exercises',()=>{
  const sessions=[{id:'older'},{id:'newer'}]
  const current={id:'today',started_at:'2026-09-20T10:00:00Z'}
  const set={exercise_id:'plan-b-instance',catalog_exercise_id:'shared-press',exercise_name:'Bankdrücken',set_position:0}
  const sets=[
    {session_id:'older',exercise_id:'plan-a-instance',catalog_exercise_id:'shared-press',exercise_name:'Bankdrücken',set_position:0,actual_weight_kg:40,actual_reps:10,completed_at:'2026-09-01T10:00:00Z'},
    {session_id:'newer',exercise_id:'another-instance',catalog_exercise_id:'different-press',exercise_name:'Bankdrücken',set_position:0,actual_weight_kg:100,actual_reps:10,completed_at:'2026-09-10T10:00:00Z'},
  ]
  assert.equal(previousForSet(sets,sessions,current,set)?.actual_weight_kg,40)
})

test('gives an explicit repetition goal while retaining achieved values as input defaults',()=>{
 const result=recommendation({actual_weight_kg:20,actual_reps:10},10,15)
 assert.equal(result.label,'20 kg halten, 11 Wiederholungen versuchen')
 assert.equal(result.reps,10)
 assert.equal(recommendation(null,10,20).label,'20 kg, 10 Wiederholungen versuchen')
})
