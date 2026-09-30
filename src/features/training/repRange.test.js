import test from 'node:test'
import assert from 'node:assert/strict'
import { repRange, rangeText, validRange } from './repRange.js'
import { rangeRecommendation, historicalSetValues } from './progression.js'

test('default is 10 to 10, range validation rejects inverted and non-integer values',()=>{
 assert.deepEqual(repRange({}),{min:10,max:10})
 assert.equal(rangeText({rep_min:6,rep_max:12}),'6 bis 12')
 for(const [a,b] of [[0,12],[12,6],['',12],[6,1001],[1.5,12],['a',12]])assert.equal(validRange(a,b),false)
 assert.equal(validRange('10','10'),true)
})
const session={id:'current',started_at:'2026-09-30'}
const group=[0,1,2].map(i=>({id:`s${i}`,exercise_id:'exercise',set_position:i,target_weight_kg:20,target_reps:6,rep_min:6,rep_max:12}))
function data(reps){return {sessions:[{id:'old',finished_at:'2026-09-29'}],sets:group.map((s,i)=>({...s,id:`old${i}`,session_id:'old',actual_weight_kg:20,actual_reps:reps[i],completed_at:'2026-09-29'}))}}
test('history remains individual while advice is capped at range maximum',()=>{
 const d=data([10,11,12])
 assert.deepEqual(group.map(s=>historicalSetValues(d,session,s).reps),[10,11,12])
 assert.match(rangeRecommendation(d,session,group,group[0],d.sets[0]).label,/11 Wiederholungen/)
 assert.match(rangeRecommendation(d,session,group,group[2],d.sets[2]).label,/20 kg halten, 12 Wiederholungen/)
})
test('load increases only when every matching historical set reaches the upper bound',()=>{
 const d=data([12,12,12])
 assert.match(rangeRecommendation(d,session,group,group[1],d.sets[1]).label,/20,4–21 kg mit 6 bis 12/)
 const partial=data([12,12,11])
 assert.match(rangeRecommendation(partial,session,group,group[0],partial.sets[0]).label,/halten/)
 d.sets.pop()
 assert.match(rangeRecommendation(d,session,group,group[0],d.sets[0]).label,/halten/)
})
