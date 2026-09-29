import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { exerciseProgress, progressForRange } from './exerciseProgress'

const ranges=[['1m','1M'],['3m','3M'],['6m','6M'],['1y','1J'],['2y','2J'],['all','Gesamt']]
const weight=value=>`${Number(value).toLocaleString('de-DE',{maximumFractionDigits:2})} kg`
const date=value=>new Date(value).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})

function ProgressChart({points,large=false}) {
  if(!points.length)return <div className="progress-empty">Keine Daten in diesem Zeitraum</div>
  return <div className={large?'progress-chart large':'progress-chart'}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{top:10,right:10,bottom:8,left:10}}>
        {large&&<Tooltip content={({active,payload})=>{
          const point=active&&payload?.[0]?.payload
          return point?<div className="progress-tooltip"><small>{date(point.date)} · {point.day}</small><strong>{weight(point.weight)} × {point.reps} Wdh.</strong></div>:null
        }}/>}
        <Line type="monotone" dataKey="weight" stroke="#16806b" strokeWidth={large?3:2}
          dot={large||points.length===1?{r:large?4:3,fill:'#16806b'}:false}
          activeDot={large?{r:6}:false} isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer>
  </div>
}

function ProgressDetail({exercise,onClose}) {
  const [range,setRange]=useState('6m')
  const points=useMemo(()=>progressForRange(exercise.points,range),[exercise.points,range])
  const first=points[0],last=points.at(-1)
  useEffect(()=>{
    function handleKey(event){if(event.key==='Escape')onClose()}
    window.addEventListener('keydown',handleKey)
    return()=>window.removeEventListener('keydown',handleKey)
  },[onClose])
  return <div className="dialog-backdrop progress-backdrop" onMouseDown={onClose}>
    <section className="card progress-dialog" role="dialog" aria-modal="true" aria-labelledby="progress-detail-heading" onMouseDown={event=>event.stopPropagation()}>
      <div className="row"><div><span className="eyebrow">ÜBUNGSVERLAUF</span><h2 id="progress-detail-heading">{exercise.name}</h2></div><button aria-label="Schließen" onClick={onClose}>×</button></div>
      <p className="muted progress-caption">Höchstes geschafftes Gewicht pro abgeschlossenem Training</p>
      <ProgressChart points={points} large/>
      <div className="progress-ranges" role="group" aria-label="Zeitraum des Graphen">
        {ranges.map(([key,label])=><button key={key} className={range===key?'active':''} aria-pressed={range===key} onClick={()=>setRange(key)}>{label}</button>)}
      </div>
      {first&&<div className="progress-stats">
        <div><small>Start</small><strong>{weight(first.weight)}</strong><small>{date(first.date)}</small></div>
        <div><small>Aktuell</small><strong>{weight(last.weight)}</strong><small>{date(last.date)}</small></div>
        <div><small>Veränderung</small><strong>{points.length>1?`${last.weight-first.weight>0?'+':''}${weight(last.weight-first.weight)}`:'—'}</strong><small>{points.length} {points.length===1?'Training':'Trainings'}</small></div>
      </div>}
      <h3>Abgeschlossene Trainings</h3>
      {points.length?<div className="progress-records">{[...points].reverse().map(point=><div className="set-row" key={point.id}><span>{date(point.date)} · {point.day}</span><strong>{weight(point.weight)} × {point.reps} Wdh.</strong></div>)}</div>:<p className="muted">Keine Trainings in diesem Zeitraum.</p>}
    </section>
  </div>
}

export function ProgressView({data}) {
  const exercises=useMemo(()=>exerciseProgress(data.sets,data.sessions,data.catalog),[data.sets,data.sessions,data.catalog])
  const [selectedId,setSelectedId]=useState(null)
  const selected=exercises.find(exercise=>exercise.id===selectedId)
  return <>
    <div className="feature-heading"><div><span className="eyebrow">DEIN VERLAUF</span><h1>Fortschritt</h1><p>Pro Übung zählt das höchste Gewicht eines abgeschlossenen Trainings. Tippe auf einen Graphen für Wiederholungen und weitere Zeiträume.</p></div></div>
    {exercises.length?<div className="progress-grid">{exercises.map(exercise=>{
      const first=exercise.points[0],last=exercise.points.at(-1)
      const change=exercise.points.length>1?last.weight-first.weight:null
      return <button type="button" className="card progress-card" key={exercise.id} onClick={()=>setSelectedId(exercise.id)}>
        <span className="progress-card-head"><strong>{exercise.name}</strong><span aria-hidden="true">↗</span></span>
        <span className="progress-value">{last.weight.toLocaleString('de-DE',{maximumFractionDigits:2})} <span>kg</span></span>
        <ProgressChart points={exercise.points}/>
        <span className="progress-change">{change===null?'Ein Training':`${change>0?'+':''}${weight(change)} seit ${date(first.date)}`}</span>
      </button>
    })}</div>:<div className="card muted">Noch keine abgeschlossenen Trainingssätze. Nach deinem ersten Training erscheinen hier die Übungsgraphen.</div>}
    {selected&&<ProgressDetail exercise={selected} onClose={()=>setSelectedId(null)}/>}
  </>
}
