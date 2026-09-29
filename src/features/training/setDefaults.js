export function nextPlanSet(targets,exerciseId) {
  const sets=targets.filter(set=>set.exercise_id===exerciseId).sort((a,b)=>a.position-b.position)
  const previous=sets.at(-1)
  return {
    position:sets.length ? Math.max(...sets.map(set=>set.position))+1 : 0,
    weight_kg:previous?.weight_kg??0,
    reps:previous?.reps??10,
  }
}

export function workoutValues(group,drafts,firstSuggestion) {
  const values=[]
  for(const set of group) {
    const previous=values.at(-1)
    const source=drafts[set.id] ?? (set.completed_at
      ? {weight:set.actual_weight_kg,reps:set.actual_reps}
      : previous ?? firstSuggestion)
    values.push({weight:String(source.weight),reps:String(source.reps)})
  }
  return values
}
