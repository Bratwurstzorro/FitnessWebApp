export function repRange(value) {
  return {min:Number(value.rep_min??10),max:Number(value.rep_max??10)}
}
export function rangeText(value) {
  const {min,max}=repRange(value)
  return `${min} bis ${max}`
}
export function validRange(min,max) {
  return Number.isInteger(Number(min))&&Number.isInteger(Number(max))&&Number(min)>=1&&Number(max)<=1000&&Number(min)<=Number(max)
}
