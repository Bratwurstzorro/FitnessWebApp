// The ACSM 2009 position stand recommends increasing load 2–10% once a lifter
// exceeds the target by 1–2 reps. Exact increments and per-set decisions are
// practical app heuristics, not validated individual prescriptions.
export function previousForSet(allSets, sessions, current, set) {
  const history = allSets.filter(row => row.completed_at && row.session_id !== current.id &&
    row.set_position === set.set_position &&
    (row.exercise_id === set.exercise_id || row.exercise_name.trim().toLocaleLowerCase('de') === set.exercise_name.trim().toLocaleLowerCase('de')) &&
    sessions.some(session => session.id === row.session_id && row.completed_at < current.started_at))
  return history.sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at))[0] ?? null
}

export function recommendation(previous, targetReps, targetWeight) {
  if (!previous) return {
    weight:Number(targetWeight), reps:Number(targetReps),
    label:'Erster Vergleichswert', detail:'Starte mit dem Planwert und passe ihn nach deinem Gefühl an.',
  }
  const weight=Number(previous.actual_weight_kg), reps=Number(previous.actual_reps)
  if (weight > 0 && reps >= Number(targetReps)+2) {
    const kg=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(n)
    return {weight,reps,label:`2–5 % mehr prüfen (ca. ${kg(weight*1.02)}–${kg(weight*1.05)} kg)`,
      detail:'Du hast das Wiederholungsziel um mindestens 2 übertroffen. Steigere nur bei sauberer Technik; die verfügbare Geräteabstufung darf abweichen.'}
  }
  if (reps >= Number(targetReps)) return {weight,reps,label:`${weight} kg halten, 1 Wiederholung mehr versuchen`,
    detail:'Erst die Wiederholungen festigen, dann das Gewicht vorsichtig erhöhen.'}
  return {weight,reps,label:`${weight} kg als Orientierung`,
    detail:'Letztes Mal lagst du unter dem Ziel. Versuche dich zu steigern oder wähle bei Bedarf leichter.'}
}
