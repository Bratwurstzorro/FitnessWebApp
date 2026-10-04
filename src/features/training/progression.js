import { repRange } from './repRange.js'
import { parseRir, repGoal, readyToIncrease, needsLighter, rirText } from './rir.js'
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

// Explanation data comes from the branch that actually produced the advice.
// The existing calculation above remains the source of the recommendation.
export function rangeRecommendation(data,session,group,set,previous,currentValues) {
  const advice=calculateRangeRecommendation(data,session,group,set,previous,currentValues)
  const {min,max}=repRange(set)
  const kg=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(Number(value))
  const performance=row=>`Satz #${Number(row.set_position)+1}: ${kg(row.actual_weight_kg)} kg × ${row.actual_reps} · ${parseRir(row.rir)==null?'RIR nicht angegeben':`RIR ${rirText(row.rir)}`}`
  const sourceDate=row=>{
    const source=data.sessions.find(s=>s.id===row.session_id)
    return source?`${new Date(source.finished_at).toLocaleDateString('de-DE')} · ${[source.plan_name,source.day_name].filter(Boolean).join(' · ')}`:''
  }
  const historical=previousForSet(data.sets,data.sessions,session,set)
  const index=group.findIndex(row=>row.id===set.id)
  const completed=group.slice(0,index).filter(row=>row.completed_at)
  const last=completed.at(-1)
  const rows=[
    {title:'Vorgabe',text:`${min}–${max} Wiederholungen pro Satz.`},
    {title:'Vergleichssatz',text:historical?`${sourceDate(historical)} · ${performance(historical)}.`:'Für diesen Satz gibt es noch kein abgeschlossenes Vergleichstraining.'},
    {title:'Heute',text:completed.length?completed.map(row=>performance(row)).join('; ')+'. Der letzte bestätigte Satz hat Vorrang vor einer historischen Gewichtserhöhung.':'Noch kein vorheriger Satz dieser Übung bestätigt; die Historie bzw. der Plan dient als Ausgangspunkt.'},
  ]
  const entered=currentValues?.weight
  if(entered!==''&&entered!=null)rows.push({title:'Satzgewicht',text:`${kg(String(entered).replace(',','.'))} kg stehen aktuell im Eingabefeld. ${advice.reason==='edited-weight'?'Diese Änderung ist bereits berücksichtigt; es wird keine weitere Erhöhung darauf aufgeschlagen.':'Die Empfehlung steht oben; sie ändert dein Eingabefeld nicht automatisch.'}`})
  if(advice.reason==='today-reduce'||advice.reason==='history-reduce') {
    const reference=advice.reason==='today-reduce'?last:previous
    const lower=advice.reason==='today-reduce'?repRange(last).min:min
    const rir=parseRir(reference.rir),reps=Number(reference.actual_reps)
    rows.push({title:'Warum leichter?',text:rir==null
      ?`${reps} Wiederholungen liegen unter der Untergrenze ${lower}. Deshalb wird eine Reduktion empfohlen.`
      :`${reps} Wiederholungen + ${rir===3?'mindestens 3':rir} RIR = ${rir===3?'mindestens ':''}${reps+rir}. Für die Untergrenze ${lower} mit etwa 1 Wiederholung Reserve wären ${lower+1} nötig. Deshalb wird eine Reduktion empfohlen.`})
  } else if(last) {
    rows.push({title:'Warum halten?',text:'Im laufenden Training wird das Gewicht nach einem bestätigten Satz nicht erneut erhöht. Für den nächsten Satz zählen die heutige Leistung und die erfasste Reserve.'})
  } else if(historical) {
    const history=group.map(row=>previousForSet(data.sets,data.sessions,session,row))
    const sameSession=history.every(row=>row&&row.session_id===history[0]?.session_id)
    const checks=history.map((row,i)=>{
      if(!row)return `Satz #${Number(group[i].set_position)+1}: Vergleich fehlt.`
      const range=repRange(group[i]),rir=parseRir(row.rir),reps=Number(row.actual_reps)
      const ready=readyToIncrease(row,range.min,range.max)
      const calculation=rir==null
        ?`${reps} Wdh. gegenüber Obergrenze ${range.max}`
        :`${reps} Wdh. + ${rir===3?'mindestens 3':rir} RIR = ${rir===3?'mindestens ':''}${reps+rir}; nötig: ${range.max+1}, bei mindestens ${range.min} geschafften Wdh.`
      return `${sourceDate(row)} · ${performance(row)} → ${calculation} → ${ready?'bereit':'noch nicht bereit'}.`
    })
    rows.push({title:'Steigerungsprüfung',text:checks.join('\n')+(sameSession?' Alle Vergleichssätze stammen aus demselben Training.':' Nicht alle Vergleichssätze sind vorhanden oder stammen aus demselben Training; deshalb keine automatische Gewichtserhöhung.')})
  }
  const goalText=reference=>{
    const reps=Number(reference.actual_reps),rir=parseRir(reference.rir)
    const raw=rir==null?reps+1:reps+rir-1
    return `${rir==null?`${reps} + 1 Wiederholung`:`${reps} Wdh. + ${rir===3?'3 (vorsichtig für 3+)':rir} RIR − 1`} = ${raw}; auf ${min}–${max} begrenzt: ${repGoal(reference,min,max)}.`
  }
  if(advice.reason==='history-hold')rows.push({title:'Wiederholungsziel',text:goalText(previous)})
  if(advice.reason==='edited-weight')rows.push({title:'Wiederholungsziel',text:Number(String(entered).replace(',','.'))>Number(previous.actual_weight_kg)
    ?`Nach der eingetragenen Gewichtserhöhung beginnt das Ziel an der Untergrenze: ${min} Wiederholungen.`
    :goalText(previous)})
  if(advice.reason==='today-hold') {
    const baseWeight=Number(previous?.actual_weight_kg??set.target_weight_kg)
    const enteredWeight=entered!==''&&entered!=null?Number(String(entered).replace(',','.')):baseWeight
    const edited=currentValues?.edited??enteredWeight!==baseWeight
    const suggested=edited&&Number.isFinite(enteredWeight)&&enteredWeight>0?Math.min(enteredWeight,Number(last.actual_weight_kg)):Number(last.actual_weight_kg)
    const reference=previous&&Number(previous.actual_weight_kg)===suggested?previous:last
    let text=`Basis ${reference===last?'heute':'Vergleichssatz'}: ${goalText(reference)}`
    if(parseRir(last.rir)!=null)text+=` Heute als zusätzliche Grenze: ${goalText(last)} Es gilt das niedrigere der beiden Ziele.`
    rows.push({title:'Wiederholungsziel',text})
  }
  if(advice.reason==='history-increase')rows.push({title:'Gewichtserhöhung',text:`Alle Vergleichssätze erfüllen die Steigerungsregel. Ausgangspunkt: ${kg(previous.actual_weight_kg)} kg; empfohlen werden wie bisher 2–5 % mehr und zunächst ${min} Wiederholungen.`})
  rows.push({title:'Entscheidung',text:advice.detail})
  return {...advice,explanation:rows}
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
function calculateRangeRecommendation(data,session,group,set,previous,currentValues) {
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
    if(needsLighter(last,repRange(last).min)) {
      if(lastWeight<=0)return {reason:'today-reduce',label:`Leichtere Variante wählen, ${min} Wiederholungen versuchen`,detail:`Im vorherigen Satz hast du ${lastReps} Wiederholungen geschafft. Für die Untergrenze mit der erfassten Reserve reicht dies nach der App-Regel nicht aus. Reduziere die Schwierigkeit für den nächsten Satz.`}
      const raw=lastWeight*.95
      const reduced=lastWeight>=5?Math.min(Math.round(raw*2)/2,lastWeight-.5):Number(raw.toFixed(2))
      const suggested=editedWeight&&Number.isFinite(enteredWeight)&&enteredWeight>0?Math.min(enteredWeight,reduced):reduced
      return {reason:'today-reduce',label:`Auf ${kg(suggested)} kg reduzieren, ${min} Wiederholungen versuchen`,detail:`Heute im vorherigen Satz: ${kg(lastWeight)} kg × ${lastReps}; die Untergrenze war ${repRange(last).min}${last.rir!=null?` und RIR ${rirText(last.rir)}`:''}. Deshalb hat eine Reduktion Vorrang vor der historischen Steigerung. Etwa 5 % weniger, hier gerundet, sind eine praktische App-Regel; an die Geräteabstufung anpassen.`}
    }
    const suggested=editedWeight&&Number.isFinite(enteredWeight)&&enteredWeight>0?Math.min(enteredWeight,lastWeight):lastWeight
    const historicalGoal=repGoal(previous&&Number(previous.actual_weight_kg)===suggested?previous:last,min,max)
    const reps=last.rir!=null?Math.min(historicalGoal,repGoal(last,min,max)):historicalGoal
    return {reason:'today-hold',label:`${kg(suggested)} kg halten, ${reps} Wiederholungen versuchen`,detail:`Vorheriger Satz heute: ${lastReps} Wiederholungen${last.rir!=null?` bei RIR ${rirText(last.rir)}`:''}. Für die weiteren Sätze wird das Gewicht nicht erneut erhöht. Die Empfehlung berücksichtigt deine heutige Leistung, erfasste Reserve und mögliche Ermüdung; mit RIR dient etwa 1–2 Reserve als Orientierung.`}
  }
  const history=group.map(row=>previousForSet(data.sets,data.sessions,session,row))
  const sameSession=history.length>0&&history.every(row=>row&&row.session_id===history[0].session_id)
  const increase=weight>0&&sameSession&&history.every((row,index)=>readyToIncrease(row,repRange(group[index]).min,repRange(group[index]).max))
  if(previous&&Number.isFinite(enteredWeight)&&enteredWeight!==weight)return {reason:'edited-weight',label:`${kg(enteredWeight)} kg halten, ${enteredWeight>weight?min:repGoal(previous,min,max)} Wiederholungen versuchen`,detail:'Die Empfehlung berücksichtigt dein bereits geändertes Satzgewicht. Bei einer Erhöhung beginne am unteren Ende der Spanne; passe die Geräteabstufung und Technik an.'}
  if(previous&&previous.session_id!==session.id&&parseRir(previous.rir)!=null&&needsLighter(previous,min)) {
    const raw=weight*.95
    const lighter=weight>=5?Math.min(Math.round(raw*2)/2,weight-.5):Number(raw.toFixed(2))
    return {reason:'history-reduce',label:weight>0?`Auf ${kg(lighter)} kg reduzieren, ${min} Wiederholungen versuchen`:`Leichtere Variante wählen, ${min} Wiederholungen versuchen`,detail:`Der letzte Vergleichssatz erreichte ${previous.actual_reps} Wiederholungen${previous.rir!=null?` bei RIR ${rirText(previous.rir)}`:''}. Für die Untergrenze mit etwas Reserve empfiehlt die App etwa 5 % weniger Gewicht. Die Geräteabstufung berücksichtigen.`}
  }
  if(increase)return {reason:'history-increase',label:`${kg(weight*1.02)}–${kg(weight*1.05)} kg prüfen, ${min} Wiederholungen versuchen`,detail:'Im letzten Vergleichstraining haben alle Sätze die Obergrenze erreicht oder bei erfasster RIR genügend geschätzte Reserve für das obere Ende mit etwa 1 Wiederholung Reserve gezeigt. Prüfe 2–5 % mehr Gewicht, passend zur Geräteabstufung; bleibe mit sauberer Technik innerhalb der Spanne.'}
  const reps=previous?repGoal(previous,min,max):min
  if(!previous)return {reason:'plan',label:`${kg(weight)} kg, ${min} Wiederholungen versuchen`,detail:'Noch kein Vergleichssatz vorhanden. Beginne mit der Planvorgabe und passe sie an deine Leistungsfähigkeit an.'}
  return {reason:'history-hold',label:`${kg(weight)} kg halten, ${reps} Wiederholungen versuchen`,detail:parseRir(previous.rir)!=null?`Letzter Satz: ${previous.actual_reps} Wiederholungen bei RIR ${rirText(previous.rir)}. Wiederholungen + RIR − 1 werden als vorsichtige Orientierung innerhalb der Spanne genutzt; Ziel ist etwa 1–2 RIR, keine garantierte Wiederholungszahl.`:previous&&Number(previous.actual_reps)>=max?'Die Obergrenze dieses Satzes ist erreicht. Festige sie, während die übrigen Sätze aufholen.':'Steigere die Wiederholungen innerhalb deiner geplanten Spanne, soweit es mit sauberer Technik möglich ist.'}
}
