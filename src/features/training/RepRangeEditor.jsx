import { useEffect, useState } from 'react'
import { NumericInput } from './NumericInput'
import { repRange, validRange } from './repRange'

export function RepRangeEditor({exercise,busy,onSave}) {
  const [min,setMin]=useState(String(repRange(exercise).min)),[max,setMax]=useState(String(repRange(exercise).max))
  useEffect(()=>{setMin(String(repRange(exercise).min));setMax(String(repRange(exercise).max))},[exercise.id,exercise.rep_min,exercise.rep_max])
  const changed=min!==String(repRange(exercise).min)||max!==String(repRange(exercise).max)
  return <form className="rep-range-editor" onSubmit={e=>{e.preventDefault();if(validRange(min,max))onSave({rep_min:Number(min),rep_max:Number(max)})}}>
    <span>Wiederholungsspanne</span><div className="rep-range-controls">
      <NumericInput kind="reps" aria-label={`${exercise.name} Wiederholungen von`} value={min} onChange={setMin} disabled={busy}/>
      <span>bis</span><NumericInput kind="reps" aria-label={`${exercise.name} Wiederholungen bis`} value={max} onChange={setMax} disabled={busy}/>
    </div>{changed&&<button className="primary" disabled={busy||!validRange(min,max)}>Speichern</button>}{changed&&!validRange(min,max)&&<small role="alert">Bitte 1–1000 Wiederholungen eingeben; die Untergrenze darf nicht größer als die Obergrenze sein.</small>}
  </form>
}
