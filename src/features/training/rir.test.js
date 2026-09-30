import test from 'node:test'
import assert from 'node:assert/strict'
import {parseRir,rirText,repGoal,readyToIncrease,needsLighter} from './rir.js'
import {rangeRecommendation} from './progression.js'
import {workoutValues} from './setDefaults.js'
test('RIR is optional, zero is distinct from missing, and 3 means 3+',()=>{
 assert.equal(parseRir(''),null);assert.equal(parseRir(null),null);assert.equal(parseRir('0'),0)
 assert.equal(rirText(3),'3+');assert.equal(rirText(null),'–')
 for(const v of [-1,4,1.5,'abc',' '])assert.throws(()=>parseRir(v))
})
test('current RIR is not copied from history and saved zero survives draft edits',()=>{
 const sets=[{id:'a'},{id:'b',completed_at:'now',actual_weight_kg:40,actual_reps:10,rir:0}]
 const values=workoutValues(sets,{},()=>({weight:40,reps:10}))
 assert.equal(values[0].rir,'');assert.equal(values[1].rir,'0')
 assert.equal(workoutValues(sets,{b:{weight:42,reps:10,rir:''}},()=>({weight:40,reps:10}))[1].rir,'')
})
test('reserve adjusts the rep goal and load threshold without treating unknown as failure',()=>{
 assert.equal(repGoal({actual_reps:10,rir:0},6,12),9)
 assert.equal(repGoal({actual_reps:10,rir:2},6,12),11)
 assert.equal(repGoal({actual_reps:10,rir:3},6,12),12)
 assert.equal(readyToIncrease({actual_reps:12,rir:0},6,12),false)
 assert.equal(readyToIncrease({actual_reps:12,rir:2},6,12),true)
 assert.equal(readyToIncrease({actual_reps:10,rir:3},6,12),true)
 assert.equal(readyToIncrease({actual_reps:12,rir:null},6,12),true)
 assert.equal(needsLighter({actual_reps:6,rir:0},6),true)
 assert.equal(needsLighter({actual_reps:6,rir:null},6),false)
})
const session={id:'now',started_at:'2026-09-30'}
const group=[0,1,2].map(i=>({id:`s${i}`,exercise_id:'ex',set_position:i,target_weight_kg:42,rep_min:6,rep_max:12}))
const dataset=rir=>({sessions:[{id:'old',finished_at:'2026-09-29'}],sets:group.map(s=>({...s,session_id:'old',completed_at:'2026-09-29',actual_weight_kg:42,actual_reps:12,rir}))})
test('all-set reserve eligibility and live fatigue override strong historical RIR',()=>{
 const exhausted=dataset(0);assert.match(rangeRecommendation(exhausted,session,group,group[0],exhausted.sets[0]).label,/halten/)
 const ready=dataset(2);assert.match(rangeRecommendation(ready,session,group,group[0],ready.sets[0]).label,/kg prüfen/)
 ready.sets[2].rir=0;assert.match(rangeRecommendation(ready,session,group,group[0],ready.sets[0]).label,/halten/)
 const live=group.map(s=>({...s}));live[0]={...live[0],completed_at:'now',actual_weight_kg:42,actual_reps:5,rir:0}
 assert.match(rangeRecommendation(dataset(3),session,live,live[1],dataset(3).sets[1]).label,/40 kg reduzieren, 6 Wiederholungen/)
 live[0].actual_reps=8
 assert.match(rangeRecommendation(dataset(3),session,live,live[1],dataset(3).sets[1]).label,/42 kg halten, 7 Wiederholungen/)
})
