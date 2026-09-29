import { useEffect, useState } from 'react'
import { WorkoutDialog } from './WorkoutDialog'
import { loadTimer, saveTimer } from './timerStorage'
import { adjustTimer, timerMilliseconds, timerText, toggleTimer } from './timerClock'

export function RestTimer({initialSeconds,idleSeconds=120,userId,sessionId}) {
  const [now,setNow]=useState(()=>Date.now())
  const [model,setModel]=useState(()=>{
    const stored=initialSeconds==null?loadTimer(userId,sessionId):null
    if(stored)return stored
    return {origin:initialSeconds!=null?'started':'idle',initialSeconds:initialSeconds??idleSeconds,
      clock:{active:initialSeconds!=null,running:initialSeconds!=null,
        deadline:initialSeconds!=null?now+initialSeconds*1000:null,remainingMs:(initialSeconds??idleSeconds)*1000}}
  })
  const clock=model.clock
  const [open,setOpen]=useState(false)
  useEffect(()=>{setModel(current=>current.origin==='idle'?{...current,initialSeconds:idleSeconds,clock:{...current.clock,remainingMs:idleSeconds*1000}}:current)},[idleSeconds])
  useEffect(()=>{saveTimer(userId,sessionId,model)},[userId,sessionId,model])
  useEffect(()=>{
    if(!clock.running)return
    const id=window.setInterval(()=>setNow(Date.now()),250)
    return ()=>window.clearInterval(id)
  },[clock.running])
  const milliseconds=timerMilliseconds(clock,now),time=timerText(milliseconds)
  const green=clock.active&&milliseconds>0
  function toggle() {const timestamp=Date.now();setNow(timestamp);setModel(current=>({...current,origin:'started',clock:toggleTimer(current.clock,timestamp,current.initialSeconds*1000)}))}
  function adjust(seconds) {setNow(Date.now());setModel(current=>({...current,origin:'started',clock:adjustTimer(current.clock,seconds)}))}
  return <>
    <button type="button" className={`floating-timer ${green?'running':'idle'}`} aria-haspopup="dialog" aria-label={clock.active?`Pausentimer ${time}, Steuerung öffnen`:'Pausentimer starten, Steuerung öffnen'} onClick={()=>setOpen(true)}>
      {clock.active?<span>{time}</span>:<svg aria-hidden="true" width="37.5" height="37.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
    </button>
    {open&&<WorkoutDialog title="Pausentimer" onClose={()=>setOpen(false)}>
      <div className="timer-popup-controls"><button type="button" onClick={()=>adjust(-15)} aria-label="15 Sekunden abziehen">−</button><strong role="timer">{time}</strong><button type="button" onClick={()=>adjust(15)} aria-label="15 Sekunden hinzufügen">+</button></div>
      <button type="button" className="primary timer-toggle" onClick={toggle}>{clock.running?'stoppen':'starten'}</button>
    </WorkoutDialog>}
  </>
}
