import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { exerciseGroups,firstOpenExercise,recentExerciseSessions,warmupSuggestion,nextExerciseAfterSet,canOfferPlanUpdate } from './trainingFocus.js'

test('resumes the first unfinished exercise and keeps sets in order',()=>{
 const rows=[{exercise_id:'b',exercise_position:1,set_position:2,completed_at:null},{exercise_id:'a',exercise_position:0,set_position:0,completed_at:'done'},{exercise_id:'b',exercise_position:1,set_position:0,completed_at:'done'}]
 const groups=exerciseGroups(rows)
 assert.equal(firstOpenExercise(groups),'b')
 assert.deepEqual(groups[1].map(s=>s.set_position),[0,2])
 assert.equal(firstOpenExercise([]),null)
 assert.equal(firstOpenExercise([groups[0]]),'a')
})
test('history is exercise-specific, finished, before this workout, and limited to two sessions',()=>{
 const current={id:'now',started_at:'2026-09-29T10:00:00Z'},set={catalog_exercise_id:'press'}
 const sessions=[{id:'old',finished_at:'2026-01-01T12:00:00Z'},{id:'last',finished_at:'2026-09-20T12:00:00Z'},{id:'second',finished_at:'2026-09-10T12:00:00Z'},{id:'future',finished_at:'2026-09-30T12:00:00Z'},{id:'active',finished_at:null}]
 const sets=sessions.map(s=>({session_id:s.id,catalog_exercise_id:'press',completed_at:s.finished_at,actual_weight_kg:40,actual_reps:10}))
 sets.push({session_id:'last',catalog_exercise_id:'other',completed_at:'2026-09-20T11:00:00Z'})
 const result=recentExerciseSessions({sessions,sets},current,set)
 assert.deepEqual(result.map(s=>s.id),['last','second'])
 assert.equal(result[0].sets.length,1)
})
test('warmup uses the latest achieved weight, ignores zero repetitions, and falls back to the plan',()=>{
 const recent=[{sets:[{actual_weight_kg:40,actual_reps:10,completed_at:'2026-09-20T10:00:00Z'},{actual_weight_kg:45,actual_reps:8,completed_at:'2026-09-20T10:05:00Z'},{actual_weight_kg:100,actual_reps:0,completed_at:'2026-09-20T10:10:00Z'}]}]
 assert.deepEqual(warmupSuggestion(recent,{target_weight_kg:80}),{weight:18,reps:6,reference:45,fromHistory:true})
 assert.equal(warmupSuggestion([],{target_weight_kg:50}).weight,20)
 assert.equal(warmupSuggestion([],{target_weight_kg:0}).weight,0)
})

test('advances only after the final new confirmation and skips finished exercises',()=>{
 const done={id:'a1',exercise_id:'a',completed_at:'done'},open={id:'a2',exercise_id:'a',completed_at:null}
 const groups=[[done,open],[{id:'b1',exercise_id:'b',completed_at:'done'}],[{id:'c1',exercise_id:'c',completed_at:null}]]
 assert.equal(nextExerciseAfterSet(groups,open),'c')
 assert.equal(nextExerciseAfterSet(groups,done),null)
 assert.equal(nextExerciseAfterSet([[open,{id:'a3',exercise_id:'a',completed_at:null}],groups[2]],open),null)
 assert.equal(nextExerciseAfterSet([[open]],open),null)
 assert.equal(nextExerciseAfterSet([groups[0],groups[2]],groups[2][0]),'a')
})

test('incomplete and empty workouts finish as history only, without a plan update question',()=>{
 assert.equal(canOfferPlanUpdate([]),false)
 assert.equal(canOfferPlanUpdate([{completed_at:'done'},{completed_at:null}]),false)
 assert.equal(canOfferPlanUpdate([{completed_at:null}]),false)
 assert.equal(canOfferPlanUpdate([{completed_at:'done'},{completed_at:'done'}]),true)
})
