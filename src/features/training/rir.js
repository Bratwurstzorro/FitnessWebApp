export function parseRir(value) {
  if(value==null||value==='')return null
  const parsed=Number(value)
  if(!['0','1','2','3'].includes(String(value))||!Number.isInteger(parsed))throw new Error('Bitte RIR 0, 1, 2 oder 3+ auswählen.')
  return parsed
}
export function rirText(value) {
  const rir=parseRir(value)
  return rir==null?'–':rir===3?'3+':String(rir)
}
export function repGoal(previous,min,max) {
  if(!previous)return min
  const rir=parseRir(previous.rir)
  const reps=Number(previous.actual_reps)
  // 3+ is used only as a conservative lower bound, never as an exact estimate.
  return Math.max(min,Math.min(max,rir==null?reps+1:reps+rir-1))
}
export function readyToIncrease(set,min,max) {
  const rir=parseRir(set.rir),reps=Number(set.actual_reps)
  return reps>=min&&(rir==null?reps>=max:reps+rir>=max+1)
}
export function needsLighter(set,min) {
  const rir=parseRir(set.rir),reps=Number(set.actual_reps)
  return rir==null?reps<min:reps+rir<min+1
}
