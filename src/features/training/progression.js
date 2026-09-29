// The ACSM 2009 position stand recommends increasing load 2–10% once a lifter
// exceeds the target by 1–2 reps. Exact increments and per-set decisions are
// practical app heuristics, not validated individual prescriptions.
export function previousForSet(allSets, sessions, current, set) {
  const history = allSets.filter(row => row.completed_at && row.session_id !== current.id &&
    row.set_position === set.set_position &&
    (row.catalog_exercise_id && set.catalog_exercise_id
      ? row.catalog_exercise_id === set.catalog_exercise_id
      : row.exercise_id === set.exercise_id || row.exercise_name === set.exercise_name) &&
    sessions.some(session => session.id === row.session_id && row.completed_at < current.started_at))
  return history.sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at))[0] ?? null
}

export function recommendation(previous, targetReps, targetWeight) {
  const kg=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)
  const repetitions=n=>`${n} ${n===1?'Wiederholung':'Wiederholungen'}`
  if (!previous) return {
    weight:Number(targetWeight), reps:Number(targetReps),
    label:`${kg(Number(targetWeight))} kg, ${repetitions(Number(targetReps))} versuchen`, detail:'Starte mit dem Planwert und passe ihn nach deinem Gefühl an.',
  }
  const weight=Number(previous.actual_weight_kg), reps=Number(previous.actual_reps)
  if (weight > 0 && reps >= Number(targetReps)+2) {
    return {weight,reps,label:`${kg(weight*1.02)}–${kg(weight*1.05)} kg mit ${repetitions(Number(targetReps))} prüfen`,
      detail:'Du hast das Wiederholungsziel um mindestens 2 übertroffen. Steigere nur bei sauberer Technik; die verfügbare Geräteabstufung darf abweichen.'}
  }
  if (reps >= Number(targetReps)) return {weight,reps,label:`${kg(weight)} kg halten, ${repetitions(Math.min(reps+1,1000))} versuchen`,
    detail:'Erst die Wiederholungen festigen, dann das Gewicht vorsichtig erhöhen.'}
  return {weight,reps,label:`${kg(weight)} kg halten, ${repetitions(Math.min(reps+1,Number(targetReps)))} versuchen`,
    detail:'Letztes Mal lagst du unter dem Ziel. Versuche dich zu steigern oder wähle bei Bedarf leichter.'}
}
