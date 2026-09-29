import { useState } from 'react'
import { addWorkoutExercise, cancelWorkout, ensureCatalogExercise, finishAndApplyToPlan, insert, remove, removeWorkoutExercise, update, saveSessionOrder } from './api'
import { previousForSet, recommendation, historicalSetValues } from './progression'
import { RestTimer } from './RestTimer'
import { NumericInput } from './NumericInput'
import { parseNumeric } from './numeric'
import { workoutValues } from './setDefaults'
import { ExercisePicker } from './ExercisePicker'
import { OrderButtons } from './OrderButtons'
import { sessionOrder } from './order'
import { ActiveExercises } from './ActiveExercises'
import { WorkoutDialog } from './WorkoutDialog'
import { canOfferPlanUpdate, confirmsLastWorkoutSet } from './trainingFocus'
import { clearTimer } from './timerStorage'

function WorkoutSet({value,index,previous,values,onDraft,busy,onDone,onRemove,historyMode}) {
  const advice = recommendation(previous,value.target_reps,value.target_weight_kg)
  return <div className={`workout-set ${value.completed_at?'complete':''}`}>
    <div className="set-heading"><strong>Satz {index+1} {value.completed_at?'✓':''}</strong><div className="actions"><button disabled={busy} onClick={onRemove} aria-label={`Satz ${index+1} entfernen`}>Entfernen</button></div></div>
    {!historyMode&&<><small>Ziel {value.target_weight_kg} kg × {value.target_reps} · zuletzt {previous?`${previous.actual_weight_kg} kg × ${previous.actual_reps}`:'kein früherer Satz'}</small>
    <div className="advice"><strong>Empfehlung: {advice.label}</strong><small>{advice.detail}</small></div></>}
    <form onSubmit={e=>{e.preventDefault();onDone({actual_weight_kg:parseNumeric(values.weight),actual_reps:parseNumeric(values.reps)})}} className="set-controls">
      <label>kg<NumericInput aria-label={`Satz ${index+1} Gewicht`} kind="weight" max="9999" value={values.weight} onChange={weight=>onDraft({...values,weight})}/></label>
      <label>Wdh.<NumericInput aria-label={`Satz ${index+1} Wiederholungen`} kind="reps" max="1000" value={values.reps} onChange={reps=>onDraft({...values,reps})}/></label>
      <button className="primary" disabled={busy}>{historyMode?'Satz speichern':value.completed_at?'Korrigieren':'Satz fertig'}</button>
    </form>
  </div>
}

export function WorkoutView({user,data,session,currentSets,timer,setTimer,busy,error,perform,onClose,historyMode=false}) {
  const [adding,setAdding]=useState(false),[finishing,setFinishing]=useState(false)
  const [drafts,setDrafts]=useState({}),[menu,setMenu]=useState(false),[exerciseMenu,setExerciseMenu]=useState(false)
  const [selectedExercise,setSelectedExercise]=useState(null),[completedPrompt,setCompletedPrompt]=useState(false)
  const groups=[...new Set(currentSets.map(s=>s.exercise_position))].sort((a,b)=>a-b)

  const selectedPosition=currentSets.find(set=>set.exercise_id===selectedExercise)?.exercise_position
  const selectedIndex=groups.indexOf(selectedPosition)
  async function moveSelectedRight() {
    if(selectedIndex<0||selectedIndex>=groups.length-1)return
    if(await perform(()=>saveSessionOrder(session.id,sessionOrder(currentSets,selectedIndex,1))))setExerciseMenu(false)
  }

  async function saveSet(set,values) {
    const success=await perform(async()=>{
      await update('training_session_sets',set.id,user.id,{...values,completed_at:set.completed_at??(historyMode?session.finished_at:new Date().toISOString())})
      if(!historyMode&&!set.completed_at)setTimer({key:set.id+Date.now(),seconds:set.rest_seconds})
    })
    if(success){
      setDrafts(current=>{const next={...current};delete next[set.id];return next})
      if(!historyMode&&confirmsLastWorkoutSet(currentSets,set))setCompletedPrompt(true)
    }
    return success
  }

  async function addSet(group) {
    const last=group[group.length-1]
    const values=workoutValues(group,drafts,set=>historicalSetValues(data,session,set)).at(-1)
    await perform(async()=>{
      if(!values.weight||!values.reps)throw new Error('Bitte zuerst Gewicht und Wiederholungen des vorherigen Satzes ausfüllen.')
      const created=await insert('training_session_sets',{
        user_id:user.id,session_id:session.id,exercise_id:last.exercise_id,catalog_exercise_id:last.catalog_exercise_id,exercise_name:last.exercise_name,
        exercise_position:last.exercise_position,set_position:Math.max(...group.map(s=>s.set_position))+1,
        rest_seconds:last.rest_seconds,target_weight_kg:parseNumeric(values.weight),target_reps:parseNumeric(values.reps),
      })
      setDrafts(current=>({...current,[created.id]:values}))
    })
  }
  async function addExercise(choice) {
    const position=groups.length?Math.max(...groups)+1:0
    const success=await perform(async()=>{
      const catalog=choice.id?choice:await ensureCatalogExercise(choice.name,user.id)
      if(currentSets.some(set=>set.catalog_exercise_id===catalog.id))throw new Error('Diese Übung ist bereits im Training vorhanden.')
      const source=data.exercises.find(ex=>ex.catalog_exercise_id===catalog.id && ex.day_id===session.source_day_id)
        ?? data.exercises.find(ex=>ex.catalog_exercise_id===catalog.id)
      const reuseSource=source?.day_id===session.source_day_id && !currentSets.some(set=>set.exercise_id===source.id)
      const exercise={id:reuseSource?source.id:crypto.randomUUID(),catalog_exercise_id:catalog.id,name:catalog.name,rest_seconds:choice.rest_seconds}
      const targets=source?data.targets.filter(target=>target.exercise_id===source.id):[]
      await addWorkoutExercise(user.id,session.id,exercise,targets,position)
    })
    if(success)setAdding(false)
  }
  async function finish(applyToPlan) {
    const success=await perform(()=>applyToPlan
      ? finishAndApplyToPlan(session.id)
      : update('training_sessions',session.id,user.id,{finished_at:new Date().toISOString()}))
    if(success){clearTimer(user.id,session.id);setFinishing(false);setTimer(null);onClose(true)}
  }
  function requestFinish() {
    setMenu(false)
    setCompletedPrompt(false)
    if(canOfferPlanUpdate(currentSets))setFinishing(true)
    else finish(false)
  }
  async function deleteExercise(first) {
    if(!window.confirm(`Übung „${first.exercise_name}“ samt Sätzen aus diesem Training entfernen?`))return
    if(await perform(()=>removeWorkoutExercise(session.id,first.exercise_position,user.id)))setExerciseMenu(false)
  }
  async function cancel() {
    if(!window.confirm('Dieses begonnene Training samt allen erfassten Sätzen endgültig löschen? Der Trainingsplan bleibt erhalten.'))return
    if(await perform(()=>cancelWorkout(session.id,user.id))){clearTimer(user.id,session.id);setTimer(null);onClose(false)}
  }
  return <>
    {!historyMode&&<div className="section-title workout-heading"><div><span className="eyebrow">LIVE</span><h2>{session.plan_name}</h2><small>{session.day_name}</small></div><button type="button" className="workout-menu-button" disabled={busy} aria-label="Trainingsaktionen öffnen" aria-haspopup="dialog" onClick={()=>setMenu(true)}><span aria-hidden="true">⚙︎</span></button></div>}
    {!historyMode&&menu&&<WorkoutDialog title="Trainingsaktionen" busy={busy} error={error} onClose={()=>setMenu(false)}>
      <button className="primary" disabled={busy} onClick={requestFinish}>Training abschließen</button>
      <button className="cancel-button" disabled={busy} onClick={cancel}>Training abbrechen</button>
      <button disabled={busy} onClick={()=>{setTimer(null);onClose(false)}}>Später fortsetzen</button>
    </WorkoutDialog>}
    {!historyMode&&completedPrompt&&<WorkoutDialog title="Alle Sätze bestätigt" busy={busy} showClose={false} onClose={()=>setCompletedPrompt(false)}>
      <button className="primary" disabled={busy} onClick={requestFinish}>Training abschließen</button>
      <button disabled={busy} onClick={()=>setCompletedPrompt(false)}>weitermachen</button>
    </WorkoutDialog>}
    {!historyMode&&exerciseMenu&&<WorkoutDialog title="Übungsaktionen" busy={busy} error={error} onClose={()=>setExerciseMenu(false)}>
      <button disabled={busy} onClick={()=>{setExerciseMenu(false);setAdding(true)}}>Übung hinzufügen</button>
      <button disabled={busy||selectedIndex<0} onClick={()=>deleteExercise(currentSets.find(set=>set.exercise_id===selectedExercise))}>Übung entfernen</button>
      <button disabled={busy||selectedIndex<0||selectedIndex===groups.length-1} onClick={moveSelectedRight}>Übung nach rechts verschieben</button>
    </WorkoutDialog>}

    {historyMode&&<p className="notice">Änderungen werden einzeln gespeichert und aktualisieren deinen Fortschritt sowie die nächsten Trainingsempfehlungen. Dein Trainingsplan bleibt unverändert.</p>}
    {historyMode&&<p className="muted">{session.plan_name} · begonnen {new Date(session.started_at).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})}</p>}
    {!historyMode&&<ActiveExercises data={data} session={session} currentSets={currentSets} drafts={drafts} setDrafts={setDrafts} busy={busy} onSaveSet={saveSet} onAddSet={addSet}
      onRemoveSet={set=>{if(window.confirm('Diesen Satz wirklich löschen?'))perform(()=>remove('training_session_sets',set.id,user.id))}}
      onExerciseChange={setSelectedExercise} onOpenMenu={id=>{setSelectedExercise(id);setExerciseMenu(true)}}/>}
    {historyMode&&<div className="stack">{groups.map((pos,groupIndex)=>{
      const group=currentSets.filter(s=>s.exercise_position===pos).sort((a,b)=>a.set_position-b.set_position)
      const defaults=workoutValues(group,drafts,set=>historicalSetValues(data,session,set))
      return <article className="card" key={group[0].exercise_id}>
        <div className="row"><div><h3>{group[0].exercise_name}</h3><small>Pause {group[0].rest_seconds} Sekunden</small></div><div className="actions"><OrderButtons index={groupIndex} count={groups.length} busy={busy} label={group[0].exercise_name} onMove={direction=>perform(()=>saveSessionOrder(session.id,sessionOrder(currentSets,groupIndex,direction)))}/><button disabled={busy} onClick={()=>{if(window.confirm(`Übung „${group[0].exercise_name}“ samt Sätzen aus diesem Training entfernen?`))perform(()=>removeWorkoutExercise(session.id,pos,user.id))}}>Übung entfernen</button></div></div>
        <div className="stack sets">{group.map((set,index)=><WorkoutSet key={set.id} value={set} index={index} values={defaults[index]} onDraft={values=>setDrafts(current=>({...current,[set.id]:values}))}
          historyMode={historyMode} previous={previousForSet(data.sets,data.sessions,session,set)} busy={busy}
          onRemove={()=>{if(window.confirm('Diesen Satz wirklich löschen?'))perform(()=>remove('training_session_sets',set.id,user.id))}}
          onDone={values=>saveSet(set,values)}/>)}
        </div><button className="link" disabled={busy} onClick={()=>addSet(group)}>+ Satz hinzufügen</button>
      </article>
    })}</div>}
    {historyMode&&(adding?<ExercisePicker catalog={data.catalog} excludeIds={currentSets.map(set=>set.catalog_exercise_id)} busy={busy} onChoose={addExercise} onCancel={()=>setAdding(false)}/>:<button className="add workout-add" onClick={()=>setAdding(true)}>+ Übung hinzufügen</button>)}
    {!historyMode&&adding&&<WorkoutDialog title="Übung hinzufügen" busy={busy} error={error} onClose={()=>setAdding(false)}><ExercisePicker catalog={data.catalog} excludeIds={currentSets.map(set=>set.catalog_exercise_id)} busy={busy} onChoose={addExercise} onCancel={()=>setAdding(false)}/></WorkoutDialog>}
    {historyMode&&<div className="footer-actions"><button className="primary" disabled={busy} onClick={()=>{if(currentSets.some(s=>!s.completed_at||drafts[s.id])&&!window.confirm('Es gibt noch nicht gespeicherte Änderungen oder Sätze. Nur gespeicherte Werte werden im Fortschritt berücksichtigt. Bearbeitung trotzdem beenden?'))return;onClose(false)}}>Bearbeitung beenden</button></div>}
    {!historyMode&&<RestTimer key={timer?.key??'idle'} initialSeconds={timer?.seconds} userId={user.id} sessionId={session.id} idleSeconds={currentSets.find(set=>set.exercise_id===selectedExercise)?.rest_seconds??120}/>}
    {finishing&&<div className="dialog-backdrop" role="presentation"><div className="card finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-heading">
      <h2 id="finish-heading">Plan übernehmen?</h2><p>Soll dieses Training mit den heutigen Übungen, Sätzen, Gewichten und Wiederholungen deinen bisherigen Trainingstag im Plan ersetzen? Deine Historie wird in beiden Fällen gespeichert.</p>
      {error&&<p className="notice error" role="alert">{error}</p>}
      {!data.days.some(d=>d.id===session.source_day_id&&d.plan_id===session.source_plan_id)&&<p className="notice">Der ursprüngliche Trainingstag ist nicht mehr vorhanden. Speichere nur die Historie.</p>}
      <div className="stack"><button className="primary" disabled={busy||!data.days.some(d=>d.id===session.source_day_id&&d.plan_id===session.source_plan_id)} onClick={()=>finish(true)}>Ja, im Plan übernehmen</button><button disabled={busy} onClick={()=>finish(false)}>Nein, nur Historie speichern</button><button disabled={busy} onClick={()=>setFinishing(false)}>Zurück zum Training</button></div>
    </div></div>}
  </>
}
