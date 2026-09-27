import { useEffect, useState } from 'react'

export function RestTimer({initialSeconds,onSkip}) {
  const [remaining,setRemaining] = useState(initialSeconds)
  const [running,setRunning] = useState(true)
  const [deadline,setDeadline] = useState(()=>Date.now()+initialSeconds*1000)
  useEffect(()=>{
    if (!running || remaining <= 0) return undefined
    const id = window.setInterval(()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000))),250)
    return ()=>window.clearInterval(id)
  },[running,remaining,deadline])
  useEffect(()=>{ if (remaining===0) setRunning(false) },[remaining])
  const time = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
  return <aside className="timer" aria-live="polite">
    <div><span>Pause</span><strong>{remaining===0?'Pause beendet':time}</strong></div>
    <div className="actions">
      <button type="button" onClick={()=>{if(!running)setDeadline(Date.now()+remaining*1000);setRunning(v=>!v)}} disabled={remaining===0}>{running?'Pausieren':'Fortsetzen'}</button>
      <button type="button" onClick={()=>{setRemaining(initialSeconds);setDeadline(Date.now()+initialSeconds*1000);setRunning(true)}}>Neustart</button>
      <button type="button" onClick={onSkip}>Überspringen</button>
    </div>
  </aside>
}
