import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { exerciseProgress, progressForRange } from './exerciseProgress.js'

test('averages completed sets per finished workout across plans and retains its strongest set',()=>{
  const sessions=[
    {id:'one',day_name:'Push',finished_at:'2026-01-10T12:00:00Z'},
    {id:'two',day_name:'Ganzkörper',finished_at:'2026-09-20T12:00:00Z'},
    {id:'active',day_name:'Push',finished_at:null},
  ]
  const set=(session_id,exercise_id,catalog_exercise_id,actual_weight_kg,actual_reps,completed_at='2026-01-10T11:00:00Z')=>
    ({session_id,exercise_id,catalog_exercise_id,exercise_name:'Bankdrücken',actual_weight_kg,actual_reps,completed_at})
  const sets=[
    set('two','other-plan','press',52,8,'2026-09-20T11:00:00Z'),
    set('one','old-plan','press',40,10),set('one','old-plan','press',45,6),
    set('two','other-plan','press',52,10,'2026-09-20T11:05:00Z'),
    set('two','other-plan','press',80,8,null),set('active','old-plan','press',100,10),
    set('two','another','different',90,8,'2026-09-20T11:00:00Z'),
  ]
  const result=exerciseProgress(sets,sessions,[{id:'press',name:'Bankdrücken'},{id:'different',name:'Andere Übung'}])
  assert.equal(result.length,2)
  assert.deepEqual(result.find(ex=>ex.id==='press').points.map(p=>[p.weight,p.setCount,p.maxWeight,p.maxReps]),[[42.5,2,45,6],[52,2,52,10]])
  assert.equal(progressForRange(result.find(ex=>ex.id==='press').points,'1m').length,1)
  assert.equal(progressForRange(result.find(ex=>ex.id==='press').points,'all').length,2)
})
