import { useEffect, useState } from 'react'
import { addWorkoutExercise, finishAndApplyToPlan, insert, remove, removeWorkoutExercise, update } from './api'
import { previousForSet, recommendation } from './progression'
import { RestTimer } from './RestTimer'
import { NumericInput } from './NumericInput'
import { parseNumeric } from './numeric'

function WorkoutSet({value,index,previous,busy,onDone,onRemove}) {
  const advice = recommendation(previous,value.target_reps,value.target_weight_kg)
  const [weight,setWeight] = useState(String(value.actual_weight_kg ?? advice.weight))
  const [reps,setReps] = useState(String(value.actual_reps ?? advice.reps))
  useEffect(()=>{
    if (value.completed_at) {
      setWeight(String(value.actual_weight_kg));setReps(String(value.actual_reps))
    }
  },[value.completed_at,value.actual_weight_kg,value.actual_reps])
  return <div className={`workout-set ${value.completed_at?'complete':''}`}>
    <div className="set-heading"><strong>Satz {index+1} {value.completed_at?'✓':''}</strong><button disabled={busy} onClick={onRemove} aria-label={`Satz ${index+1} entfernen`}>Entfernen</button></div>
    <small>Ziel {value.target_weight_kg} kg × {value.target_reps} · zuletzt {previous?`${previous.actual_weight_kg} kg × ${previous.actual_reps}`:'kein früherer Satz'}</small>
    <div className="advice"><strong>Empfehlung: {advice.label}</strong><small>{advice.detail}</small></div>
    <form onSubmit={e=>{e.preventDefault();onDone({actual_weight_kg:parseNumeric(weight),actual_reps:parseNumeric(reps)})}} className="set-controls">
      <label>kg<NumericInput aria-label={`Satz ${index+1} Gewicht`} kind="weight" max="9999" value={weight} onChange={setWeight}/></label>
      <label>Wdh.<NumericInput aria-label={`Satz ${index+1} Wiederholungen`} kind="reps" max="1000" value={reps} onChange={setReps}/></label>
      <button className="primary" disabled={busy}>{value.completed_at?'Korrigieren':'Satz fertig'}</button>
    </form>
  </div>
}

function AddExercise({exercises,onAdd,onCancel,busy}) {
  const [selected,setSelected]=useState('new'),[name,setName]=useState(''),[rest,setRest]=useState(120)
  return <form className="card stack" onSubmit={e=>{e.preventDefault();onAdd(selected,name.trim(),Number(rest))}}>
    <h3>Übung hinzufügen</h3>
    <label>Auswahl<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="new">Neue Übung</option>{exercises.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</select></label>
    {selected==='new'&&<><label>Name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="z. B. Seitheben"/></label><label>Pause<select value={rest} onChange={e=>setRest(e.target.value)}>{[60,90,120,180].map(n=><option value={n} key={n}>{n} Sekunden</option>)}</select></label></>}
    <div className="actions"><button type="button" onClick={onCancel}>Abbrechen</button><button className="primary" disabled={busy}>Hinzufügen</button></div>
  </form>
}

export function WorkoutView({user,data,session,currentSets,timer,setTimer,busy,error,perform,onClose}) {
  const [adding,setAdding]=useState(false),[finishing,setFinishing]=useState(false)
  const groups=[...new Set(currentSets.map(s=>s.exercise_position))].sort((a,b)=>a-b)
  const available=data.exercises.filter(ex=>!currentSets.some(s=>s.exercise_id===ex.id))

  async function addSet(group) {
    const last=group[group.length-1]
    await perform(()=>insert('training_session_sets',{
      user_id:user.id,session_id:session.id,exercise_id:last.exercise_id,exercise_name:last.exercise_name,
      exercise_position:last.exercise_position,set_position:Math.max(...group.map(s=>s.set_position))+1,
      rest_seconds:last.rest_seconds,target_weight_kg:last.actual_weight_kg??last.target_weight_kg,
      target_reps:last.actual_reps||last.target_reps,
    }))
  }
  async function addExercise(selected,name,rest) {
    const existing=data.exercises.find(ex=>ex.id===selected)
    const ex=existing??{id:crypto.randomUUID(),name,rest_seconds:rest}
    const targets=existing?data.targets.filter(t=>t.exercise_id===existing.id):[]
    const position=groups.length?Math.max(...groups)+1:0
    if(await perform(()=>addWorkoutExercise(user.id,session.id,ex,targets,position)))setAdding(false)
  }
  async function finish(applyToPlan) {
    const success=await perform(()=>applyToPlan
      ? finishAndApplyToPlan(session.id)
      : update('training_sessions',session.id,user.id,{finished_at:new Date().toISOString()}))
    if(success){setFinishing(false);setTimer(null);onClose(true)}
  }
  return <>
    <p className="muted">{session.plan_name} · begonnen {new Date(session.started_at).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})}</p>
    {timer&&<RestTimer key={timer.key} initialSeconds={timer.seconds} onSkip={()=>setTimer(null)}/>}
    <div className="stack">{groups.map(pos=>{
      const group=currentSets.filter(s=>s.exercise_position===pos).sort((a,b)=>a.set_position-b.set_position)
      return <article className="card" key={pos}>
        <div className="row"><div><h3>{group[0].exercise_name}</h3><small>Pause {group[0].rest_seconds} Sekunden</small></div><button disabled={busy} onClick={()=>{if(window.confirm(`Übung „${group[0].exercise_name}“ samt Sätzen aus diesem Training entfernen?`))perform(()=>removeWorkoutExercise(session.id,pos,user.id))}}>Übung entfernen</button></div>
        <div className="stack sets">{group.map((set,index)=><WorkoutSet key={set.id} value={set} index={index}
          previous={previousForSet(data.sets,data.sessions,session,set)} busy={busy}
          onRemove={()=>{if(!set.completed_at||window.confirm('Abgeschlossenen Satz wirklich entfernen?'))perform(()=>remove('training_session_sets',set.id,user.id))}}
          onDone={values=>perform(async()=>{await update('training_session_sets',set.id,user.id,{...values,completed_at:new Date().toISOString()});setTimer({key:set.id+Date.now(),seconds:set.rest_seconds})})}/>)}
        </div><button className="link" disabled={busy} onClick={()=>addSet(group)}>+ Satz hinzufügen</button>
      </article>
    })}</div>
    {adding?<AddExercise exercises={available} busy={busy} onAdd={addExercise} onCancel={()=>setAdding(false)}/>:<button className="add workout-add" onClick={()=>setAdding(true)}>+ Übung hinzufügen</button>}
    <p className="evidence">Die Empfehlung ist eine Orientierung. Die ACSM-Leitlinie beschreibt Laststeigerungen von 2–10 %, wenn 1–2 Wiederholungen mehr als geplant gelingen; der konkrete Sprung pro Satz ist eine App-Regel. <a href="https://pubmed.ncbi.nlm.nih.gov/19204579/" target="_blank" rel="noreferrer">ACSM 2009</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">ACSM 2026</a></p>
    <div className="footer-actions"><button disabled={busy} onClick={()=>{setTimer(null);onClose(false)}}>Später fortsetzen</button><button className="primary" disabled={busy||!currentSets.length||!currentSets.every(s=>s.completed_at)} onClick={()=>setFinishing(true)}>Training abschließen</button></div>
    {finishing&&<div className="dialog-backdrop" role="presentation"><div className="card finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-heading">
      <h2 id="finish-heading">Plan übernehmen?</h2><p>Soll dieses Training mit den heutigen Übungen, Sätzen, Gewichten und Wiederholungen deinen bisherigen Trainingstag im Plan ersetzen? Deine Historie wird in beiden Fällen gespeichert.</p>
      {error&&<p className="notice error" role="alert">{error}</p>}
      {!data.days.some(d=>d.id===session.source_day_id&&d.plan_id===session.source_plan_id)&&<p className="notice">Der ursprüngliche Trainingstag ist nicht mehr vorhanden. Speichere nur die Historie.</p>}
      <div className="stack"><button className="primary" disabled={busy||!data.days.some(d=>d.id===session.source_day_id&&d.plan_id===session.source_plan_id)} onClick={()=>finish(true)}>Ja, im Plan übernehmen</button><button disabled={busy} onClick={()=>finish(false)}>Nein, nur Historie speichern</button><button disabled={busy} onClick={()=>setFinishing(false)}>Zurück zum Training</button></div>
    </div></div>}
  </>
}
