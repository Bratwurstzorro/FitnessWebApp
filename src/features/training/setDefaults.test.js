import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { nextPlanSet, workoutValues } from './setDefaults.js'

test('each added plan set copies the immediately preceding set',()=>{
  const sets=[{exercise_id:'press',position:0,weight_kg:40,reps:10}]
  assert.deepEqual(nextPlanSet(sets,'press'),{position:1,weight_kg:40,reps:10})
  sets.push({exercise_id:'press',position:1,weight_kg:42,reps:10})
  assert.deepEqual(nextPlanSet(sets,'press'),{position:2,weight_kg:42,reps:10})
  assert.deepEqual(nextPlanSet(sets,'other'),{position:0,weight_kg:0,reps:10})
})

test('each set retains its own defaults and edits never overwrite another set',()=>{
 const group=[{id:'one',weight:40,reps:13},{id:'two',weight:42,reps:14},{id:'three',weight:45,reps:15}]
 assert.deepEqual(workoutValues(group,{},set=>set),[{weight:'40',reps:'13'},{weight:'42',reps:'14'},{weight:'45',reps:'15'}])
 assert.deepEqual(workoutValues(group,{two:{weight:'43',reps:'16'}},set=>set),[{weight:'40',reps:'13'},{weight:'43',reps:'16'},{weight:'45',reps:'15'}])
 // Newly added sets explicitly receive the preceding draft as their own values.
 const lastDraft={weight:'43',reps:'16'}
 assert.deepEqual(workoutValues([{id:'new'}],{new:lastDraft},()=>({weight:0,reps:10})),[lastDraft])
})
