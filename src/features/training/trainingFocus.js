export function exerciseGroups(sets) {
  return [...new Set(sets.map(s=>s.exercise_position))].sort((a,b)=>a-b)
    .map(pos=>sets.filter(s=>s.exercise_position===pos).sort((a,b)=>a.set_position-b.set_position))
}
export function firstOpenExercise(groups) {
  return (groups.find(group=>group.some(s=>!s.completed_at))??groups[0])?.[0].exercise_id??null
}
export function recentExerciseSessions(data,current,set) {
  const matches=row=>row.catalog_exercise_id&&set.catalog_exercise_id
    ?row.catalog_exercise_id===set.catalog_exercise_id
    :row.exercise_id===set.exercise_id||row.exercise_name===set.exercise_name
  return data.sessions.filter(s=>s.id!==current.id&&s.finished_at&&new Date(s.finished_at)<=new Date(current.started_at))
    .sort((a,b)=>new Date(b.finished_at)-new Date(a.finished_at))
    .map(session=>({...session,sets:data.sets.filter(row=>row.session_id===session.id&&row.completed_at&&matches(row))
      .sort((a,b)=>a.exercise_position-b.exercise_position||a.set_position-b.set_position)}))
    .filter(session=>session.sets.length).slice(0,2)
}
export function warmupSuggestion(recent,firstSet) {
  const previous=recent[0]?.sets.filter(s=>Number(s.actual_reps)>0&&Number(s.actual_weight_kg)>0).sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at))[0]
  const reference=Number(previous?.actual_weight_kg??firstSet.target_weight_kg)
  return {weight:Math.round(reference*.4*10)/10,reps:6,reference,fromHistory:!!previous}
}
