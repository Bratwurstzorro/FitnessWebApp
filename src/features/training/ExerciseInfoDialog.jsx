import { useMemo, useState } from 'react'
import { WorkoutDialog } from './WorkoutDialog'
import { ProgressChart } from './ProgressView'
import { exerciseHistory } from './exerciseHistory'
import { guideForExercise } from './exerciseGuides'
import { ExerciseIllustration } from './ExerciseIllustration'
import { rirText } from './rir'

const weight=value=>value==null?'—':`${Number(value).toLocaleString('de-DE',{maximumFractionDigits:2})} kg`
const date=value=>new Date(value).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})

export function ExerciseInfoDialog({exercise,data,session,onClose}) {
  const [tab,setTab]=useState('execution')
  const history=useMemo(()=>exerciseHistory(data,exercise,session.id),[data,exercise,session.id])
  const guide=guideForExercise(exercise.exercise_name)
  const tabs=[['execution','Ausführung'],['history','Historie']]
  return <WorkoutDialog title={exercise.exercise_name} onClose={onClose} className="exercise-info-dialog">
    <div className="exercise-info-tabs" role="tablist" aria-label="Übungsdetails">
      {tabs.map(([id,label])=><button key={id} type="button" role="tab" id={`exercise-info-tab-${id}`} aria-controls={`exercise-info-panel-${id}`} aria-selected={tab===id} tabIndex={tab===id?0:-1} className={tab===id?'selected':''} onClick={()=>setTab(id)}
        onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'execution':event.key==='End'?'history':tab==='execution'?'history':'execution';setTab(next);document.getElementById(`exercise-info-tab-${next}`)?.focus()}}}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`exercise-info-panel-${tab}`} aria-labelledby={`exercise-info-tab-${tab}`} tabIndex={0}>
      {tab==='execution'?(guide?<div className="exercise-instructions">
        <ExerciseIllustration guide={guide}/>
        <h3>Setup</h3><ol>{guide.setup.map(text=><li key={text}>{text}</li>)}</ol>
        <h3>Ausführung</h3><ol>{guide.execution.map(text=><li key={text}>{text}</li>)}</ol>
        <h3>Darauf achten</h3><ul>{guide.cues.map(text=><li key={text}>{text}</li>)}</ul>
        <a className="exercise-guide-source" href={guide.source} target="_blank" rel="noreferrer">Technikreferenz ansehen ↗</a>
      </div>:<p className="muted">Für diese Übung ist noch keine bebilderte Anleitung hinterlegt.</p>):<>
        <div className="progress-stats exercise-info-stats">
          <div><small>Workouts</small><strong>{history.count}</strong></div>
          <div><small>Maximalgewicht</small><strong>{weight(history.maxWeight)}</strong></div>
          <div><small>Max. bei ≥ 10 Wdh.</small><strong>{weight(history.maxTenWeight)}</strong></div>
        </div>
        <h3>Fortschritt</h3>
        <p className="muted exercise-graph-caption">Durchschnittsgewicht pro Wiederholung je Workout · älteste Daten links, neueste rechts.</p>
        <ProgressChart points={history.points} large showAxes/>
        <h3 className="exercise-history-heading">Alle ausgeführten Trainings</h3>
        {history.workouts.length?<div className="stack exercise-all-history">{history.workouts.map(workout=><details key={workout.id} className="exercise-history-workout">
          <summary><strong>{date(workout.finished_at)} · {workout.day_name}</strong><span>{workout.plan_name} · {workout.sets.length} {workout.sets.length===1?'Satz':'Sätze'}</span></summary>
          {workout.sets.map(set=><div className="set-row" key={set.id}><span>Satz #{set.set_position+1}</span><strong>{weight(set.actual_weight_kg)} × {set.actual_reps} · RIR {rirText(set.rir)}</strong></div>)}
        </details>)}</div>:<p className="muted">Noch keine abgeschlossenen Workouts mit dieser Übung.</p>}
      </>}
    </div>
  </WorkoutDialog>
}
