const timerKey=(userId,sessionId)=>`bodytrack:timer:${userId}:${sessionId}`
const activeKey=userId=>`bodytrack:active-training:${userId}`
const browserStorage=()=>{try{return typeof window==='undefined'?null:window.localStorage}catch{return null}}

export function loadTimer(userId,sessionId,storage=browserStorage()) {
  try {
    const value=JSON.parse(storage?.getItem(timerKey(userId,sessionId))??'null'),clock=value?.clock
    if(value?.version!==1||!clock||!['idle','started'].includes(value.origin)||
      typeof clock.active!=='boolean'||typeof clock.running!=='boolean'||!Number.isFinite(clock.remainingMs)||
      !Number.isFinite(value.initialSeconds)||value.initialSeconds<0||
      (clock.running&&(!clock.active||!Number.isFinite(clock.deadline)))||(!clock.running&&clock.deadline!==null))return null
    return {clock,initialSeconds:value.initialSeconds,origin:value.origin}
  }catch{return null}
}
export function saveTimer(userId,sessionId,value,storage=browserStorage()) {
  try{storage?.setItem(timerKey(userId,sessionId),JSON.stringify({version:1,...value}))}catch{/* Training remains usable when local storage is unavailable. */}
}
export function clearTimer(userId,sessionId,storage=browserStorage()) {
  try{storage?.removeItem(timerKey(userId,sessionId))}catch{/* Optional local state. */}
}
export function loadActiveTraining(userId,storage=browserStorage()) {
  try{return storage?.getItem(activeKey(userId))??null}catch{return null}
}
export function saveActiveTraining(userId,sessionId,storage=browserStorage()) {
  try{if(sessionId)storage?.setItem(activeKey(userId),sessionId);else storage?.removeItem(activeKey(userId))}catch{/* Optional local state. */}
}
