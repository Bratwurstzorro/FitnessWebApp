// A workout contributes its heaviest completed set to each exercise's curve.
// Repetitions break ties, so every point represents a set that was actually done.
export function exerciseProgress(sets, sessions, catalog) {
  const finished=new Map(sessions.filter(session=>session.finished_at).map(session=>[session.id,session]))
  const names=new Map(catalog.map(exercise=>[exercise.id,exercise.name]))
  const exercises=new Map()
  for(const set of sets) {
    const session=finished.get(set.session_id)
    if(!session || !set.completed_at || set.actual_weight_kg==null || set.actual_reps==null)continue
    const key=set.catalog_exercise_id ?? `name:${set.exercise_name}`
    if(!exercises.has(key))exercises.set(key,{id:key,name:names.get(key)??set.exercise_name,points:new Map()})
    const points=exercises.get(key).points
    const existing=points.get(session.id)
    const weight=Number(set.actual_weight_kg),reps=Number(set.actual_reps)
    if(!existing || weight>existing.weight || (weight===existing.weight && reps>existing.reps)){
      points.set(session.id,{id:session.id,date:session.finished_at,weight,reps,day:session.day_name})
    }
  }
  return [...exercises.values()].map(exercise=>({
    id:exercise.id,name:exercise.name,
    points:[...exercise.points.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),
  })).sort((a,b)=>a.name.localeCompare(b.name,'de'))
}

export function progressForRange(points,range) {
  if(range==='all' || !points.length)return points
  const latest=new Date(points.at(-1).date)
  const cutoff=new Date(latest)
  if(range.endsWith('m'))cutoff.setUTCMonth(cutoff.getUTCMonth()-Number(range.slice(0,-1)))
  else if(range.endsWith('y'))cutoff.setUTCFullYear(cutoff.getUTCFullYear()-Number(range.slice(0,-1)))
  return points.filter(point=>new Date(point.date)>=cutoff && new Date(point.date)<=latest)
}
