import { exerciseProgress } from './exerciseProgress.js'

export function exerciseHistory(data, exercise, currentSessionId) {
  const finished=data.sessions.filter(s=>s.finished_at&&s.id!==currentSessionId)
  const ids=new Set(finished.map(s=>s.id))
  const sets=data.sets.filter(row=>{
    const matches=row.catalog_exercise_id&&exercise.catalog_exercise_id
      ?row.catalog_exercise_id===exercise.catalog_exercise_id
      :row.exercise_id===exercise.exercise_id||row.exercise_name===exercise.exercise_name
    return matches&&ids.has(row.session_id)&&row.completed_at&&row.actual_weight_kg!=null&&row.actual_reps!=null&&
      Number.isFinite(Number(row.actual_weight_kg))&&Number(row.actual_weight_kg)>=0&&
      Number.isFinite(Number(row.actual_reps))&&Number(row.actual_reps)>0
  })
  const workouts=finished.map(session=>({...session,sets:sets.filter(s=>s.session_id===session.id)
    .sort((a,b)=>a.exercise_position-b.exercise_position||a.set_position-b.set_position)}))
    .filter(s=>s.sets.length).sort((a,b)=>new Date(b.finished_at)-new Date(a.finished_at))
  const maximum=rows=>rows.length?Math.max(...rows.map(row=>Number(row.actual_weight_kg))):null
  // Merge legacy name-only rows into this exercise after matching identity.
  const normalized=sets.map(row=>({...row,catalog_exercise_id:exercise.catalog_exercise_id??null,exercise_name:exercise.exercise_name}))
  const points=exerciseProgress(normalized,finished,[])[0]?.points??[]
  return {workouts,points,count:workouts.length,maxWeight:maximum(sets),maxTenWeight:maximum(sets.filter(s=>Number(s.actual_reps)>=10))}
}
