import { useEffect, useRef } from 'react'

export function WorkoutDialog({title,busy,error,onClose,children}) {
  const dialog=useRef(null)
  useEffect(()=>{const element=dialog.current;element.showModal();return()=>element.close()},[])
  return <dialog ref={dialog} className="card workout-dialog" aria-label={title} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
    <div className="row"><h2>{title}</h2><button type="button" disabled={busy} aria-label="Fenster schließen" onClick={onClose}>×</button></div>
    {error&&<p className="notice error" role="alert">{error}</p>}
    <div className="stack">{children}</div>
  </dialog>
}
