import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { moved,sessionOrder } from './order.js'
import { exerciseProgress } from './exerciseProgress.js'

test('moves only the selected neighboring item and keeps its values and ID',()=>{
  const rows=[{id:'a',weight:40},{id:'b',weight:42},{id:'c',weight:45}]
  assert.deepEqual(moved(rows,1,1),[rows[0],rows[2],rows[1]])
  assert.deepEqual(moved(rows,0,-1),rows)
  assert.deepEqual(rows.map(r=>r.id),['a','b','c'])
})

test('reorders whole exercises while preserving the relative order of their sets',()=>{
  const rows=[
    {id:'a1',exercise_position:2,set_position:0},
    {id:'b1',exercise_position:5,set_position:1},
    {id:'a2',exercise_position:2,set_position:3},
  ]
  assert.deepEqual(sessionOrder(rows,1,-1),[
    {id:'b1',exercise_position:0,set_position:0},
    {id:'a1',exercise_position:1,set_position:0},
    {id:'a2',exercise_position:1,set_position:1},
  ])

})

test('a historical correction, added set or deleted set changes the weighted progress at the original date',()=>{
  const sessions=[{id:'session',finished_at:'2026-01-10T12:00:00Z'}]
  const set=(id,weight,reps)=>({id,session_id:'session',catalog_exercise_id:'press',exercise_name:'Press',actual_weight_kg:weight,actual_reps:reps,completed_at:'2026-01-10T11:00:00Z'})
  const point=rows=>exerciseProgress(rows,sessions,[])[0].points[0]
  assert.equal(point([set('a',40,10),set('b',50,5)]).weight,650/15)
  const corrected=[set('a',42,10),set('b',50,5)]
  assert.equal(point(corrected).weight,670/15)
  assert.equal(point([...corrected,set('c',60,5)]).weight,970/20)
  assert.equal(point(corrected.slice(1)).weight,50)
  assert.equal(point(corrected).date,sessions[0].finished_at)
})
