import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {adjustTimer,timerMilliseconds,timerText,toggleTimer} from './timerClock.js'

test('keeps counting below zero after expiry and accounts for background time',()=>{
 const clock={active:true,running:true,deadline:60000,remainingMs:60000}
 assert.equal(timerText(timerMilliseconds(clock,0)),'1:00')
 assert.equal(timerText(timerMilliseconds(clock,60000)),'0:00')
 assert.equal(timerText(timerMilliseconds(clock,61000)),'−0:01')
 assert.equal(timerText(timerMilliseconds(clock,135000)),'−1:15')
})
test('stop resets to the original rest duration, including after overtime',()=>{
 const running={active:true,running:true,deadline:60000,remainingMs:60000}
 const stopped=toggleTimer(running,72000,60000)
 assert.equal(stopped.running,false)
 assert.equal(stopped.active,false)
 assert.equal(timerText(timerMilliseconds(stopped,90000)),'1:00')
 const resumed=toggleTimer(stopped,90000,60000)
 assert.equal(resumed.active,true)
 assert.equal(timerText(timerMilliseconds(resumed,95000)),'0:55')
})
test('15 second adjustments work when running, stopped, idle and across zero',()=>{
 const running={active:true,running:true,deadline:60000,remainingMs:60000}
 assert.equal(timerText(timerMilliseconds(adjustTimer(running,15),65000)),'0:10')
 assert.equal(timerText(timerMilliseconds(adjustTimer(running,-15),65000)),'−0:20')
 const idle={active:false,running:false,deadline:null,remainingMs:90000}
 const adjusted=adjustTimer(idle,-15)
 assert.equal(adjusted.active,false)
 assert.equal(timerText(timerMilliseconds(adjusted,0)),'1:15')
 assert.equal(toggleTimer(adjusted,1000,90000).deadline,76000)
})
