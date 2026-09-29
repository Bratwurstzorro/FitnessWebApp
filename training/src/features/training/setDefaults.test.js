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

test('live third set follows the edited second set, including unsaved input',()=>{
  const group=[{id:'one'},{id:'two'},{id:'three'}]
  const values=workoutValues(group,{two:{weight:'42',reps:'10'}},{weight:40,reps:10})
  assert.deepEqual(values,[
    {weight:'40',reps:'10'},
    {weight:'42',reps:'10'},
    {weight:'42',reps:'10'},
  ])
  assert.equal(workoutValues([{id:'one'},{id:'two',completed_at:'today',actual_weight_kg:45,actual_reps:8},{id:'three'}],{}, {weight:40,reps:10})[2].weight,'45')
})
