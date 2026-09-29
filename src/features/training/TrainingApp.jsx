import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ensureCatalogExercise, insert, loadTraining, remove, startSession, update } from './api'
import { WorkoutView } from './WorkoutView'
import { ExercisePicker } from './ExercisePicker'
import { NumericInput } from './NumericInput'
import { parseNumeric } from './numeric'
import { nextPlanSet } from './setDefaults'

const ProgressView=lazy(()=>import('./ProgressView').then(module=>({default:module.ProgressView})))

const empty = {plans:[],days:[],exercises:[],targets:[],sessions:[],sets:[],catalog:[]}
const date = (stamp) => new Date(stamp).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})
const number = (value) => parseNumeric(value)

function PromptForm({label,value='',onSave,onCancel}) {
  const [text,setText]=useState(String(value))
  return <form className="inline-form" onSubmit={e=>{e.preventDefault();onSave(text.trim())}}><input aria-label={label} autoFocus required type="text" maxLength={100} value={text} onChange={e=>setText(e.target.value)}/><button className="primary">Speichern</button><button type="button" onClick={onCancel}>Abbrechen</button></form>
}

function SetEditor({initial,onSave,onCancel}) {
  const [weight,setWeight]=useState(String(initial?.weight_kg??0)),[reps,setReps]=useState(String(initial?.reps??10))
  return <form className="inline-form" onSubmit={e=>{e.preventDefault();onSave({weight_kg:number(weight),reps:number(reps)})}}>
    <label>kg<NumericInput kind="weight" max="9999" value={weight} onChange={setWeight}/></label>
    <label>Wdh.<NumericInput kind="reps" max="1000" value={reps} onChange={setReps}/></label>
    <button className="primary">Speichern</button><button type="button" onClick={onCancel}>Abbrechen</button></form>
}

export function TrainingArea({user,page,onNavigate}) {
  const [data,setData]=useState(empty),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [planId,setPlanId]=useState(null),[dayId,setDayId]=useState(null),[editing,setEditing]=useState(null),[timer,setTimer]=useState(null)
  const [activeSession,setActiveSession]=useState(null)
  const refresh=useCallback(async()=>{setData(await loadTraining(user.id))},[user.id])
  useEffect(()=>{let live=true;loadTraining(user.id).then(d=>{if(live){setData(d);setLoading(false)}}).catch(e=>{if(live){setError(e.message);setLoading(false)}});return()=>{live=false}},[user.id])
  async function perform(task) {setBusy(true);setError('');try{await task();await refresh();return true}catch(e){setError(e.message||'Speichern fehlgeschlagen.');return false}finally{setBusy(false)}}
  const plan=data.plans.find(p=>p.id===planId),day=data.days.find(d=>d.id===dayId)
  const days=data.days.filter(d=>d.plan_id===planId),exercises=data.exercises.filter(e=>e.day_id===dayId)
  const session=activeSession && data.sessions.find(s=>s.id===activeSession)
  const currentSets=useMemo(()=>data.sets.filter(s=>s.session_id===activeSession),[data.sets,activeSession])
  const history=data.sessions.filter(s=>s.finished_at)
  async function begin(dayChoice) {
    await perform(async()=>{
      const source=data.exercises.filter(e=>e.day_id===dayChoice.id).sort((a,b)=>a.position-b.position)
      const created=await startSession(user.id,plan,dayChoice,source,data.targets)
      setActiveSession(created.id);setTimer(null);onNavigate('workout')
    })
  }
  const editingAt=(kind,id)=>editing?.kind===kind && editing.id===id
  if(loading) return <div className="training-surface"><main className="shell">Training wird geladen …</main></div>
  return <div className="training-surface"><div className={`shell ${page==='progress'?'progress-shell':''}`}>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {page==='plans'&&<>
      <div className="section-title"><div><span className="eyebrow">DEINE ROUTINE</span><h2>{day?day.name:plan?plan.name:'Trainingspläne'}</h2></div>{day?<button onClick={()=>setDayId(null)}>← Tage</button>:plan?<button onClick={()=>setPlanId(null)}>← Pläne</button>:null}</div>
      {!plan&&<div className="stack">{data.plans.map(p=><article className="card row" key={p.id}><button className="item" onClick={()=>{setPlanId(p.id);setDayId(null)}}><strong>{p.name}</strong><small>{data.days.filter(d=>d.plan_id===p.id).length} Tage →</small></button><div className="actions"><button disabled={busy} onClick={()=>setEditing({kind:'plan',id:p.id})}>Bearbeiten</button><button disabled={busy} onClick={()=>{if(window.confirm(`Plan „${p.name}“ löschen?`))perform(()=>remove('training_plans',p.id,user.id))}}>Löschen</button></div>{editingAt('plan',p.id)&&<PromptForm label="Planname" value={p.name} onCancel={()=>setEditing(null)} onSave={name=>perform(async()=>{await update('training_plans',p.id,user.id,{name});setEditing(null)})}/>}</article>)}
        {editingAt('newplan',null)?<PromptForm label="Planname" onCancel={()=>setEditing(null)} onSave={name=>perform(async()=>{await insert('training_plans',{user_id:user.id,name});setEditing(null)})}/>:<button className="add" onClick={()=>setEditing({kind:'newplan',id:null})}>+ Plan erstellen</button>}</div>}
      {plan&&!day&&<div className="stack">{days.map(d=><article className="card row" key={d.id}><button className="item" onClick={()=>setDayId(d.id)}><strong>{d.name}</strong><small>{data.exercises.filter(e=>e.day_id===d.id).length} Übungen →</small></button><div className="actions"><button className="primary" disabled={busy} onClick={()=>begin(d)}>Starten</button><button onClick={()=>setEditing({kind:'day',id:d.id})}>Bearbeiten</button><button disabled={busy} onClick={()=>{if(window.confirm(`Tag „${d.name}“ löschen?`))perform(()=>remove('training_days',d.id,user.id))}}>Löschen</button></div>{editingAt('day',d.id)&&<PromptForm label="Tagesname" value={d.name} onCancel={()=>setEditing(null)} onSave={name=>perform(async()=>{await update('training_days',d.id,user.id,{name});setEditing(null)})}/>}</article>)}
        {editingAt('newday',null)?<PromptForm label="Tagesname" onCancel={()=>setEditing(null)} onSave={name=>perform(async()=>{await insert('training_days',{user_id:user.id,plan_id:plan.id,name,position:days.length});setEditing(null)})}/>:<button className="add" onClick={()=>setEditing({kind:'newday',id:null})}>+ Trainingstag hinzufügen</button>}</div>}
      {day&&<div className="stack">{exercises.map(ex=><article className="card" key={ex.id}><div className="row"><div><strong>{ex.name}</strong><small className="block">Pause: {ex.rest_seconds} Sekunden</small></div><div className="actions"><button onClick={()=>setEditing({kind:'exercise',id:ex.id})}>Bearbeiten</button><button disabled={busy} onClick={()=>{if(window.confirm(`Übung „${ex.name}“ löschen?`))perform(()=>remove('training_exercises',ex.id,user.id))}}>Löschen</button></div></div>
        {editingAt('exercise',ex.id)&&<PromptForm label="Übungsname" value={ex.name} onCancel={()=>setEditing(null)} onSave={name=>perform(async()=>{const catalog=await ensureCatalogExercise(name,user.id);await update('training_exercises',ex.id,user.id,{name:catalog.name,catalog_exercise_id:catalog.id});setEditing(null)})}/>}
        <label className="rest-label">Pause je Satz <select value={ex.rest_seconds} onChange={e=>perform(()=>update('training_exercises',ex.id,user.id,{rest_seconds:number(e.target.value)}))}>{[60,90,120,180].map(v=><option key={v} value={v}>{v} Sekunden</option>)}</select></label>
        <div className="set-list">{data.targets.filter(t=>t.exercise_id===ex.id).map((t,i)=><div className="set-row" key={t.id}><span>Satz {i+1}</span><strong>{t.weight_kg} kg × {t.reps}</strong><div className="actions"><button onClick={()=>setEditing({kind:'target',id:t.id})}>Ändern</button><button disabled={busy} onClick={()=>perform(()=>remove('training_targets',t.id,user.id))}>×</button></div>{editingAt('target',t.id)&&<SetEditor initial={t} onCancel={()=>setEditing(null)} onSave={values=>perform(async()=>{await update('training_targets',t.id,user.id,values);setEditing(null)})}/>}</div>)}</div>
        {editingAt('newtarget',ex.id)?<SetEditor key={`new-${ex.id}-${editing.initial.position}`} initial={editing.initial} onCancel={()=>setEditing(null)} onSave={values=>perform(async()=>{await insert('training_targets',{user_id:user.id,exercise_id:ex.id,position:editing.initial.position,...values});setEditing(null)})}/>:<button className="link" disabled={busy} onClick={()=>setEditing({kind:'newtarget',id:ex.id,initial:nextPlanSet(data.targets,ex.id)})}>+ Satz hinzufügen</button>}</article>)}
        {editingAt('newexercise',null)?<ExercisePicker catalog={data.catalog} busy={busy} onCancel={()=>setEditing(null)} onChoose={choice=>perform(async()=>{const catalog=choice.id?choice:await ensureCatalogExercise(choice.name,user.id);await insert('training_exercises',{user_id:user.id,day_id:day.id,name:catalog.name,catalog_exercise_id:catalog.id,rest_seconds:choice.rest_seconds,position:exercises.length});setEditing(null)})}/>:<button className="add" onClick={()=>setEditing({kind:'newexercise',id:null})}>+ Übung hinzufügen</button>}</div>}
    </>}
    {page==='workout'&&<><div className="section-title"><div><span className="eyebrow">LIVE</span><h2>{session?session.day_name:'Training starten'}</h2></div></div>
      {!session&&<div className="stack">{data.plans.flatMap(p=>data.days.filter(d=>d.plan_id===p.id).map(d=><article className="card row" key={d.id}><div><strong>{d.name}</strong><small className="block">{p.name}</small></div><button className="primary" disabled={busy} onClick={()=>{setPlanId(p.id);beginFor(p,d)}}>Starten</button></article>))}{data.sessions.filter(s=>!s.finished_at).map(s=><article className="card row" key={s.id}><div><strong>{s.day_name}</strong><small className="block">Begonnen {date(s.started_at)}</small></div><button onClick={()=>{setActiveSession(s.id);setTimer(null)}}>Fortsetzen</button></article>)}</div>}
      {session&&<WorkoutView user={user} data={data} session={session} currentSets={currentSets} timer={timer} setTimer={setTimer} busy={busy} error={error} perform={perform} onClose={finished=>{setActiveSession(null);if(finished)onNavigate('history')}}/>}
    </>}
    {page==='history'&&<><div className="section-title"><div><span className="eyebrow">FORTSCHRITT</span><h2>Trainingshistorie</h2></div></div>{history.length===0?<div className="card muted">Noch keine abgeschlossenen Trainings.</div>:<div className="stack">{history.map(s=><details className="card" key={s.id}><summary><strong>{s.day_name}</strong><span>{date(s.finished_at)} · {s.plan_name}</span></summary><div className="history-sets">{data.sets.filter(t=>t.session_id===s.id).map(t=><div className="set-row" key={t.id}><span>{t.exercise_name} · Satz {t.set_position+1}</span><strong>{t.completed_at?`${t.actual_weight_kg} kg × ${t.actual_reps}`:'Nicht absolviert'}</strong></div>)}</div></details>)}</div>}</>}
    {page==='progress'&&<Suspense fallback={<div className="card muted">Fortschritt wird geladen …</div>}><ProgressView data={data}/></Suspense>}
  </div></div>
  async function beginFor(chosenPlan,chosenDay) {await perform(async()=>{const source=data.exercises.filter(e=>e.day_id===chosenDay.id).sort((a,b)=>a.position-b.position);const created=await startSession(user.id,chosenPlan,chosenDay,source,data.targets);setActiveSession(created.id);setTimer(null);onNavigate('workout')})}
}
