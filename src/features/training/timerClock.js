export function timerMilliseconds(clock,now) {
  return clock.running?clock.deadline-now:clock.remainingMs
}
export function toggleTimer(clock,now,initialMs) {
  if(clock.running)return {...clock,active:false,running:false,remainingMs:initialMs,deadline:null}
  return {...clock,active:true,running:true,deadline:now+clock.remainingMs}
}
export function adjustTimer(clock,seconds) {
  return clock.running?{...clock,deadline:clock.deadline+seconds*1000}:{...clock,remainingMs:clock.remainingMs+seconds*1000}
}
export function timerText(milliseconds) {
  const seconds=Math.ceil(milliseconds/1000),absolute=Math.abs(seconds)
  return `${seconds<0?'−':''}${Math.floor(absolute/60)}:${String(absolute%60).padStart(2,'0')}`
}
