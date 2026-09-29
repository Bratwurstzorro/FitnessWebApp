// Each workout contributes total volume load divided by completed repetitions.
// Keep the heaviest set separately for context in the detail view.
export function exerciseProgress(sets, sessions, catalog) {
  const finished=new Map(sessions.filter(session=>session.finished_at).map(session=>[session.id,session]))
  const names=new Map(catalog.map(exercise=>[exercise.id,exercise.name]))
  const exercises=new Map()
  for(const set of sets) {
    const session=finished.get(set.session_id)
    if(!session || !set.completed_at || set.actual_weight_kg==null || set.actual_reps==null)continue
    const weight=Number(set.actual_weight_kg),reps=Number(set.actual_reps)
    if(!Number.isFinite(weight) || !Number.isFinite(reps) || reps<=0)continue
    const key=set.catalog_exercise_id ?? `name:${set.exercise_name}`
    if(!exercises.has(key))exercises.set(key,{id:key,name:names.get(key)??set.exercise_name,points:new Map()})
    const points=exercises.get(key).points
    let point=points.get(session.id)
    if(!point){
      point={id:session.id,date:session.finished_at,volumeLoad:0,totalReps:0,setCount:0,maxWeight:weight,maxReps:reps,day:session.day_name}
      points.set(session.id,point)
    }
    point.volumeLoad+=weight*reps
    point.totalReps+=reps
    point.setCount+=1
    if(weight>point.maxWeight || (weight===point.maxWeight && reps>point.maxReps)){
      point.maxWeight=weight
      point.maxReps=reps
    }
  }
  return [...exercises.values()].map(exercise=>({
    id:exercise.id,name:exercise.name,
    points:[...exercise.points.values()]
      .map(({volumeLoad,...point})=>({...point,weight:volumeLoad/point.totalReps}))
      .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),
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
