import { repRange } from './repRange.js'
// The ACSM 2009 position stand recommends increasing load 2–10% once a lifter
// exceeds the target by 1–2 reps. Exact increments and per-set decisions are
// practical app heuristics, not validated individual prescriptions.
export function previousForSet(allSets, sessions, current, set) {
  const history = allSets.filter(row => row.completed_at && row.session_id !== current.id &&
    row.set_position === set.set_position &&
    (row.catalog_exercise_id && set.catalog_exercise_id
      ? row.catalog_exercise_id === set.catalog_exercise_id
      : row.exercise_id === set.exercise_id || row.exercise_name === set.exercise_name) &&
    sessions.some(session => session.id === row.session_id && session.finished_at && new Date(session.finished_at)<=new Date(current.started_at)))
  const finishedAt=new Map(sessions.map(session=>[session.id,new Date(session.finished_at).getTime()]))
  return history.sort((a,b)=>finishedAt.get(b.session_id)-finishedAt.get(a.session_id)||new Date(b.completed_at)-new Date(a.completed_at))[0] ?? null
}

export function recommendation(previous, targetReps, targetWeight) {
  const kg=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)
  const repetitions=n=>`${n} ${n===1?'Wiederholung':'Wiederholungen'}`
  if (!previous) return {
    weight:Number(targetWeight), reps:Number(targetReps),
    label:`${kg(Number(targetWeight))} kg, ${repetitions(Number(targetReps))} versuchen`, detail:'Starte mit dem Planwert und passe ihn nach deinem Gefühl an.',
  }
  const weight=Number(previous.actual_weight_kg), reps=Number(previous.actual_reps)
  const comparisonGoal=Number(previous.target_reps??targetReps)
  if (weight > 0 && reps >= comparisonGoal+2) {
    return {weight,reps,label:`${kg(weight*1.02)}–${kg(weight*1.05)} kg mit ${repetitions(comparisonGoal)} prüfen`,
      detail:`Im Vergleichstraining waren ${comparisonGoal} Wiederholungen geplant; geschafft hast du ${reps}. Das sind mindestens 2 mehr. Prüfe 2–5 % mehr Gewicht bei sauberer Technik und passender Geräteabstufung.`}
  }
  if (reps >= Number(targetReps)) return {weight,reps,label:`${kg(weight)} kg halten, ${repetitions(Math.min(reps+1,1000))} versuchen`,
    detail:'Erst die Wiederholungen festigen, dann das Gewicht vorsichtig erhöhen.'}
  return {weight,reps,label:`${kg(weight)} kg halten, ${repetitions(Math.min(reps+1,Number(targetReps)))} versuchen`,
    detail:'Letztes Mal lagst du unter dem Ziel. Versuche dich zu steigern oder wähle bei Bedarf leichter.'}
}

export function historicalSetValues(data,session,set) {
  const previous=previousForSet(data.sets,data.sessions,session,set)
  return previous?{weight:previous.actual_weight_kg,reps:previous.actual_reps}
    :{weight:set.target_weight_kg,reps:set.target_reps}
}

// Keep the plan range stable and compare each set with its own last performance.
export function rangeRecommendation(data,session,group,set,previous) {
  const {min,max}=repRange(set)
  const kg=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)
  const weight=Number(previous?.actual_weight_kg??set.target_weight_kg)
  const history=group.map(row=>previousForSet(data.sets,data.sessions,session,row))
  const sameSession=history.length>0&&history.every(row=>row&&row.session_id===history[0].session_id)
  const increase=weight>0&&sameSession&&history.every((row,index)=>Number(row.actual_reps)>=repRange(group[index]).max)
  if(increase)return {label:`${kg(weight*1.02)}–${kg(weight*1.05)} kg mit ${min} bis ${max} Wiederholungen prüfen`,detail:'Im letzten Vergleichstraining haben alle Sätze die Obergrenze erreicht. Prüfe 2–5 % mehr Gewicht, passend zur Geräteabstufung; bleibe mit sauberer Technik innerhalb der Spanne.'}
  const reps=previous?Math.min(max,Math.max(min,Number(previous.actual_reps)+1)):min
  return {label:`${kg(weight)} kg halten, ${reps} Wiederholungen versuchen`,detail:previous&&Number(previous.actual_reps)>=max?'Die Obergrenze dieses Satzes ist erreicht. Festige sie, während die übrigen Sätze aufholen.':'Steigere die Wiederholungen innerhalb deiner geplanten Spanne, soweit es mit sauberer Technik möglich ist.'}
}
