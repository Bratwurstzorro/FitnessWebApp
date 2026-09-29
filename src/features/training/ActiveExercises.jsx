import { useState } from 'react'
import { NumericInput } from './NumericInput'
import { OrderButtons } from './OrderButtons'
import { parseNumeric } from './numeric'
import { workoutValues } from './setDefaults'
import { previousForSet, recommendation } from './progression'
import { exerciseGroups, firstOpenExercise, recentExerciseSessions, warmupSuggestion, nextExerciseAfterSet } from './trainingFocus'

const kg=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(value)
const date=value=>new Date(value).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})

function ActiveSet({set,index,values,active,busy,onDraft,onSave,onRemove}) {
  const editable=active||!!set.completed_at
  return <div className={`focused-set ${set.completed_at?'complete':''} ${!editable?'locked':''}`}>
    <form className="focused-set-row" onSubmit={event=>{event.preventDefault();onSave({actual_weight_kg:parseNumeric(values.weight),actual_reps:parseNumeric(values.reps)})}}>
      <strong>Satz #{index+1}</strong>
      <label><span className="set-input-label">kg</span><NumericInput kind="weight" value={values.weight} disabled={busy||!editable} onChange={weight=>onDraft({...values,weight})} aria-label={`Satz ${index+1} Gewicht`}/></label>
      <label><span className="set-input-label">Wdh.</span><NumericInput kind="reps" value={values.reps} disabled={busy||!editable} onChange={reps=>onDraft({...values,reps})} aria-label={`Satz ${index+1} Wiederholungen`}/></label>
      <button type="submit" className="set-check" disabled={busy||!editable} aria-label={set.completed_at?`Satz ${index+1} Korrektur speichern`:`Satz ${index+1} bestätigen`}>✓</button>
      <button type="button" className="set-delete" disabled={busy} onClick={onRemove} aria-label={`Satz ${index+1} entfernen`}>×</button>
    </form>

  </div>
}

export function ActiveExercises({data,session,currentSets,drafts,setDrafts,busy,onSaveSet,onAddSet,onRemoveSet,onRemoveExercise,onMoveExercise}) {
  const groups=exerciseGroups(currentSets)
  const [selected,setSelected]=useState(()=>firstOpenExercise(groups))
  const group=groups.find(g=>g[0].exercise_id===selected)??groups.find(g=>g[0].exercise_id===firstOpenExercise(groups))
  if(!group)return <div className="card muted">Füge eine Übung hinzu, um das Training fortzusetzen.</div>
  const first=group[0],groupIndex=groups.indexOf(group),activeIndex=group.findIndex(s=>!s.completed_at),activeSet=group[activeIndex]
  const recent=recentExerciseSessions(data,session,first),warmup=warmupSuggestion(recent,first)
  const previous=previousForSet(data.sets,data.sessions,session,first)
  const defaults=workoutValues(group,drafts,recommendation(previous,first.target_reps,first.target_weight_kg))
  const prior=activeIndex>0?group[activeIndex-1]:null
  const baseline=prior?.completed_at?prior:activeSet?previousForSet(data.sets,data.sessions,session,activeSet):null
  const advice=activeSet?recommendation(baseline,activeSet.target_reps,activeSet.target_weight_kg):null
  const next=groups.find(g=>g!==group&&g.some(s=>!s.completed_at))
  return <>
    <div className="exercise-tabs" role="tablist" aria-label="Übungen im Training">{groups.map(g=>{
      const ex=g[0],done=g.every(s=>s.completed_at)
      return <button key={ex.exercise_id} type="button" role="tab" id={`exercise-tab-${ex.exercise_id}`} aria-controls="active-exercise-panel" aria-selected={g===group} title={ex.exercise_name} aria-label={`${ex.exercise_name}${done?' · abgeschlossen':''}`} className={g===group?'selected':''} onClick={()=>setSelected(ex.exercise_id)}>{Array.from(ex.exercise_name.trim()).slice(0,2).join('').toLocaleUpperCase('de-DE')}{done&&<small aria-hidden="true">✓</small>}</button>
    })}</div>
    <article className="card focused-exercise" role="tabpanel" id="active-exercise-panel" aria-labelledby={`exercise-tab-${first.exercise_id}`}>
      <h2>{first.exercise_name}</h2>
      <p className="focused-target">{group.length} Sätze · Vorgabe: {group.map(s=>s.target_reps).join(' / ')} Wiederholungen</p>
      <details className="warmup-box" key={`warmup-${first.exercise_id}`}><summary><strong>Aufwärmen: {warmup.reference>0?`1 × ${warmup.reps} mit ca. ${kg(warmup.weight)} kg`:'6 leichte Wiederholungen ohne Zusatzgewicht'}</strong></summary>
        <small>{warmup.reference>0?`40 % von ${kg(warmup.reference)} kg (${warmup.fromHistory?'letzter absolvierter Satz':'Planwert, noch keine Historie'}). Auf die Geräteabstufung anpassen und locker ausführen.`:'Wähle eine leichte Variante passend zur Übung.'}</small>
        <small>Ribeiro et al. (2020) untersuchten bei Bankdrücken und Kniebeugen u. a. 6 Wiederholungen mit 40 % der Trainingslast. Die Übertragung auf dein letztes Satzgewicht und andere Übungen ist eine praktische App-Regel. Bei schweren Arbeitsgewichten können weitere Aufwärmsätze nötig sein. <a href="https://pubmed.ncbi.nlm.nih.gov/32971729/" target="_blank" rel="noreferrer">Studie</a></small>
      </details>
      <div className="focused-set-columns" aria-hidden="true"><span>Satz</span><span>kg</span><span>Wdh.</span><span></span><span></span></div>
      <div className="focused-sets">{group.map((set,index)=><ActiveSet key={set.id} set={set} index={index} values={defaults[index]} active={index===activeIndex} busy={busy}
        onDraft={values=>setDrafts(current=>({...current,[set.id]:values}))} onSave={async values=>{const nextId=nextExerciseAfterSet(groups,set);if(await onSaveSet(set,values)){if(nextId)setSelected(nextId)}}} onRemove={()=>onRemoveSet(set)}/>)}</div>
      <button className="link" disabled={busy} onClick={()=>onAddSet(group)}>+ Satz hinzufügen</button>
      {advice?<details className="advice active-advice" key={activeSet.id}><summary><strong>Satz #{activeIndex+1}: {advice.label}</strong></summary><small>{advice.detail}</small><small>{prior?.completed_at?`Basis: heute Satz #${activeIndex} · ${prior.actual_weight_kg} kg × ${prior.actual_reps}`:baseline?`Zuletzt: ${baseline.actual_weight_kg} kg × ${baseline.actual_reps}`:'Basis: dein Trainingsplan'}</small><small>Laststeigerungen von 2–10 % bei 1–2 Wiederholungen über dem Ziel sind eine ACSM-Orientierung; die konkrete Empfehlung pro Satz ist eine App-Regel. <a href="https://pubmed.ncbi.nlm.nih.gov/19204579/" target="_blank" rel="noreferrer">ACSM 2009</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">ACSM 2026</a></small></details>:<div className="notice">Alle Sätze dieser Übung sind abgeschlossen.{next&&<button className="primary" onClick={()=>setSelected(next[0].exercise_id)}>Nächste Übung</button>}</div>}
      <aside className="recent-training"><strong>Die letzten zwei Trainings</strong>{recent.length?recent.map(previous=><div key={previous.id}><p>{date(previous.finished_at)} · {previous.plan_name} · {previous.day_name}</p>{previous.sets.map((set,index)=><div className="recent-set" key={set.id}><span>Satz #{index+1}</span><span>{set.actual_weight_kg} kg</span><span>{set.actual_reps} Wdh.</span></div>)}</div>):<p>Noch keine abgeschlossenen Trainings für diese Übung.</p>}</aside>
      <div className="focused-exercise-actions"><OrderButtons index={groupIndex} count={groups.length} busy={busy} label={first.exercise_name} onMove={direction=>onMoveExercise(groupIndex,direction)}/><button disabled={busy} onClick={()=>onRemoveExercise(first)}>Übung entfernen</button></div>
    </article>
  </>
}
