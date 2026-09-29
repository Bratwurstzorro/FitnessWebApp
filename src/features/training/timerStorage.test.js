import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {loadTimer,saveTimer,clearTimer,loadActiveTraining,saveActiveTraining} from './timerStorage.js'
import {timerMilliseconds,timerText,toggleTimer,adjustTimer} from './timerClock.js'
const storage=()=>{const rows=new Map();return {getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)}}
const model={origin:'started',initialSeconds:90,clock:{active:true,running:true,deadline:90000,remainingMs:90000}}

test('reload restores running deadline, adjustments and overtime, separately per user and workout',()=>{
 const local=storage()
 saveTimer('user','session',model,local)
 const restored=loadTimer('user','session',local)
 assert.equal(timerText(timerMilliseconds(restored.clock,60000)),'0:30')
 assert.equal(timerText(timerMilliseconds(restored.clock,105000)),'−0:15')
 saveTimer('user','session',{...restored,clock:adjustTimer(restored.clock,15)},local)
 assert.equal(timerText(timerMilliseconds(loadTimer('user','session',local).clock,105000)),'0:00')
 assert.equal(loadTimer('other','session',local),null)
 assert.equal(loadTimer('user','other',local),null)
})
test('reload restores stopped icon state and original duration; finishing clears it',()=>{
 const local=storage(),stopped={...model,clock:toggleTimer(model.clock,50000,90000)}
 saveTimer('user','session',stopped,local)
 const restored=loadTimer('user','session',local)
 assert.equal(restored.clock.active,false)
 assert.equal(restored.clock.running,false)
 assert.equal(timerText(timerMilliseconds(restored.clock,100000)),'1:30')
 assert.equal(restored.initialSeconds,90)
 saveActiveTraining('user','session',local)
 assert.equal(loadActiveTraining('user',local),'session')
 clearTimer('user','session',local)
 saveActiveTraining('user',null,local)
 assert.equal(loadTimer('user','session',local),null)
 assert.equal(loadActiveTraining('user',local),null)
})
test('broken or unavailable local storage does not prevent training',()=>{
 const local=storage()
 local.setItem('bodytrack:timer:user:session','broken JSON')
 assert.equal(loadTimer('user','session',local),null)
 local.setItem('bodytrack:timer:user:session',JSON.stringify({version:1,...model,clock:{...model.clock,deadline:'bad'}}))
 assert.equal(loadTimer('user','session',local),null)
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}}
 assert.equal(loadTimer('user','session',blocked),null)
 assert.doesNotThrow(()=>saveTimer('user','session',model,blocked))
 assert.doesNotThrow(()=>clearTimer('user','session',blocked))
})
