import { useEffect, useRef } from 'react'
import { rangeText } from './repRange'

export function TrainingPreview({plan,day,exercises,targets,busy,error,onStart,onClose}) {
  const dialog=useRef(null)
  const rows=exercises.filter(ex=>ex.day_id===day.id).sort((a,b)=>a.position-b.position)
    .map(ex=>({...ex,sets:targets.filter(set=>set.exercise_id===ex.id).sort((a,b)=>a.position-b.position)}))
  const setCount=rows.reduce((count,ex)=>count+ex.sets.length,0)
  useEffect(()=>{
    const element=dialog.current
    element.showModal()
    return ()=>{element.close()}
  },[])
  return <dialog ref={dialog} className="card training-preview" aria-labelledby="training-preview-title"
    onCancel={event=>{event.preventDefault();if(!busy)onClose()}}
    onClick={event=>{if(event.target===dialog.current){const box=dialog.current.getBoundingClientRect();if(!busy&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))onClose()}}}>
    <div className="row preview-heading"><h2 id="training-preview-title">{plan.name}</h2><button type="button" disabled={busy} aria-label="Vorschau schließen" onClick={onClose}>×</button></div>
    <p className="preview-day">{day.name}</p>
    <p className="preview-counts">{rows.length} {rows.length===1?'Übung':'Übungen'} · {setCount} {setCount===1?'Satz':'Sätze'}</p>
    <button className="primary preview-start" disabled={busy||setCount===0} onClick={onStart}>{busy?'Wird gestartet …':'Starten'}</button>
    {error&&<p className="notice error" role="alert">{error}</p>}
    {setCount===0&&<p className="notice">Füge im Trainingsplan zuerst mindestens einen Satz hinzu.</p>}
    <ul className="preview-exercises">{rows.map(ex=><li key={ex.id}><strong>{ex.name}</strong><span>{ex.sets.length?`${ex.sets.length} × ${rangeText(ex)} Wdh.`:'Keine Sätze geplant'}</span></li>)}</ul>
  </dialog>
}
