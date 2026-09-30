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
export function rangeRecommendation(data,session,group,set,previous,currentValues) {
  const {min,max}=repRange(set)
  const kg=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)
  const weight=Number(previous?.actual_weight_kg??set.target_weight_kg)
  const enteredWeight=currentValues?.weight!==''&&currentValues?.weight!=null?Number(String(currentValues.weight).replace(',','.')):weight
  const editedWeight=currentValues?.edited??enteredWeight!==weight
  // Today’s completed sets take precedence over an older workout’s increase.
  // Load progression is assessed at the start of an exercise, never repeatedly
  // applied to each later set despite fatigue in the current workout.
  const index=group.findIndex(row=>row.id===set.id)
  const last=group.slice(0,index).filter(row=>row.completed_at).at(-1)
  if(last) {
    const lastWeight=Number(last.actual_weight_kg),lastReps=Number(last.actual_reps)
    if(lastReps<repRange(last).min) {
      if(lastWeight<=0)return {label:`Leichtere Variante wählen, ${min} Wiederholungen versuchen`,detail:`Im vorherigen Satz hast du ${lastReps} Wiederholungen geschafft und die Untergrenze verfehlt. Reduziere die Schwierigkeit für den nächsten Satz.`}
      const raw=lastWeight*.95
      const reduced=lastWeight>=5?Math.min(Math.round(raw*2)/2,lastWeight-.5):Number(raw.toFixed(2))
      const suggested=editedWeight&&Number.isFinite(enteredWeight)&&enteredWeight>0?Math.min(enteredWeight,reduced):reduced
      return {label:`Auf ${kg(suggested)} kg reduzieren, ${min} Wiederholungen versuchen`,detail:`Heute im vorherigen Satz: ${kg(lastWeight)} kg × ${lastReps}; die Untergrenze war ${repRange(last).min}. Deshalb hat eine Reduktion Vorrang vor der historischen Steigerung. Etwa 5 % weniger, hier gerundet, sind eine praktische App-Regel; an die Geräteabstufung anpassen.`}
    }
    const suggested=editedWeight&&Number.isFinite(enteredWeight)&&enteredWeight>0?Math.min(enteredWeight,lastWeight):lastWeight
    const reps=Math.min(max,Math.max(min,previous&&Number(previous.actual_weight_kg)===suggested?Number(previous.actual_reps)+1:lastReps))
    return {label:`${kg(suggested)} kg halten, ${reps} Wiederholungen versuchen`,detail:`Der vorherige Satz heute lag mit ${lastReps} Wiederholungen innerhalb der Vorgabe. Für die weiteren Sätze wird das Gewicht nicht erneut erhöht. Die Empfehlung berücksichtigt deine heutige Leistung und die mögliche Ermüdung.`}
  }
  const history=group.map(row=>previousForSet(data.sets,data.sessions,session,row))
  const sameSession=history.length>0&&history.every(row=>row&&row.session_id===history[0].session_id)
  const increase=weight>0&&sameSession&&history.every((row,index)=>Number(row.actual_reps)>=repRange(group[index]).max)
  if(previous&&Number.isFinite(enteredWeight)&&enteredWeight!==weight)return {label:`${kg(enteredWeight)} kg halten, ${enteredWeight>weight?min:Math.min(max,Math.max(min,Number(previous.actual_reps)+1))} Wiederholungen versuchen`,detail:'Die Empfehlung berücksichtigt dein bereits geändertes Satzgewicht. Bei einer Erhöhung beginne am unteren Ende der Spanne; passe die Geräteabstufung und Technik an.'}
  if(increase)return {label:`${kg(weight*1.02)}–${kg(weight*1.05)} kg prüfen, ${min} Wiederholungen versuchen`,detail:'Im letzten Vergleichstraining haben alle Sätze die Obergrenze erreicht. Prüfe 2–5 % mehr Gewicht, passend zur Geräteabstufung; bleibe mit sauberer Technik innerhalb der Spanne.'}
  const reps=previous?Math.min(max,Math.max(min,Number(previous.actual_reps)+1)):min
  if(!previous)return {label:`${kg(weight)} kg, ${min} Wiederholungen versuchen`,detail:'Noch kein Vergleichssatz vorhanden. Beginne mit der Planvorgabe und passe sie an deine Leistungsfähigkeit an.'}
  return {label:`${kg(weight)} kg halten, ${reps} Wiederholungen versuchen`,detail:previous&&Number(previous.actual_reps)>=max?'Die Obergrenze dieses Satzes ist erreicht. Festige sie, während die übrigen Sätze aufholen.':'Steigere die Wiederholungen innerhalb deiner geplanten Spanne, soweit es mit sauberer Technik möglich ist.'}
}
