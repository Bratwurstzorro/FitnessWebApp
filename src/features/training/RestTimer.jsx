import { useEffect, useState } from 'react'
import { WorkoutDialog } from './WorkoutDialog'
import { adjustTimer, timerMilliseconds, timerText, toggleTimer } from './timerClock'

export function RestTimer({initialSeconds,idleSeconds=120}) {
  const [now,setNow]=useState(()=>Date.now())
  const [clock,setClock]=useState(()=>({active:initialSeconds!=null,running:initialSeconds!=null,
    deadline:initialSeconds!=null?now+initialSeconds*1000:null,remainingMs:(initialSeconds??idleSeconds)*1000}))
  const [open,setOpen]=useState(false)
  useEffect(()=>{setClock(current=>current.active?current:{...current,remainingMs:idleSeconds*1000})},[idleSeconds])
  useEffect(()=>{
    if(!clock.running)return
    const id=window.setInterval(()=>setNow(Date.now()),250)
    return ()=>window.clearInterval(id)
  },[clock.running])
  const milliseconds=timerMilliseconds(clock,now),time=timerText(milliseconds)
  const green=clock.active&&milliseconds>0
  function toggle() {const timestamp=Date.now();setNow(timestamp);setClock(current=>toggleTimer(current,timestamp))}
  function adjust(seconds) {setNow(Date.now());setClock(current=>adjustTimer(current,seconds))}
  return <>
    <button type="button" className={`floating-timer ${green?'running':'idle'}`} aria-haspopup="dialog" aria-label={clock.active?`Pausentimer ${time}, Steuerung öffnen`:'Pausentimer starten, Steuerung öffnen'} onClick={()=>setOpen(true)}>
      {clock.active?<span>{time}</span>:<svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
    </button>
    {open&&<WorkoutDialog title="Pausentimer" onClose={()=>setOpen(false)}>
      <div className="timer-popup-controls"><button type="button" onClick={()=>adjust(-15)} aria-label="15 Sekunden abziehen">−</button><strong role="timer">{time}</strong><button type="button" onClick={()=>adjust(15)} aria-label="15 Sekunden hinzufügen">+</button></div>
      <button type="button" className="primary timer-toggle" onClick={toggle}>{clock.running?'stoppen':'starten'}</button>
    </WorkoutDialog>}
  </>
}
