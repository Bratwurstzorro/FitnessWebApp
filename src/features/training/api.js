import { supabase } from '../../lib/supabase'

function unwrap(result) {
  if (result.error) throw result.error
  return result.data
}

// PostgREST caps a single result page. Keep older workouts available to the
// history and progress charts even after a user has logged many sets.
async function loadAll(table,userId,orderColumn,ascending=true) {
  const rows=[]
  const size=1000
  for(let offset=0;;offset+=size) {
    const page=unwrap(await supabase.from(table).select('*').eq('user_id',userId)
      .order(orderColumn,{ascending}).order('id',{ascending}).range(offset,offset+size-1))
    rows.push(...page)
    if(page.length<size)return rows
  }
}

export async function loadTraining(userId) {
  const [plans, days, exercises, targets, sessions, sets, catalog] = await Promise.all([
    supabase.from('training_plans').select('*').eq('user_id',userId).order('created_at'),
    supabase.from('training_days').select('*').eq('user_id',userId).order('position'),
    supabase.from('training_exercises').select('*').eq('user_id',userId).order('position'),
    supabase.from('training_targets').select('*').eq('user_id',userId).order('position'),
    loadAll('training_sessions',userId,'started_at',false),
    loadAll('training_session_sets',userId,'id'),
    supabase.from('training_exercise_catalog').select('id,name').order('name'),
  ])
  return {plans:unwrap(plans),days:unwrap(days),exercises:unwrap(exercises),targets:unwrap(targets),sessions,sets:sets.sort((a,b)=>a.exercise_position-b.exercise_position||a.set_position-b.set_position),catalog:unwrap(catalog)}
}

export async function ensureCatalogExercise(name,userId) {
  const trimmed=name.trim()
  if(!trimmed || trimmed.length>100)throw new Error('Bitte einen Übungsnamen mit höchstens 100 Zeichen eingeben.')
  const lookup=()=>supabase.from('training_exercise_catalog').select('id,name').eq('name',trimmed).maybeSingle()
  const existing=unwrap(await lookup())
  if(existing)return existing
  const result=await supabase.from('training_exercise_catalog')
    .insert({name:trimmed,created_by:userId}).select('id,name').single()
  if(!result.error)return result.data
  if(result.error.code==='23505')return unwrap(await lookup())
  throw result.error
}

export async function insert(table, value) {
  return unwrap(await supabase.from(table).insert(value).select().single())
}
export async function update(table, id, userId, value) {
  return unwrap(await supabase.from(table).update(value).eq('id',id).eq('user_id',userId).select().single())
}
export async function remove(table, id, userId) {
  unwrap(await supabase.from(table).delete().eq('id',id).eq('user_id',userId))
}

export async function savePlanOrder(table,rows,userId) {
  if(!['training_exercises','training_targets'].includes(table))throw new Error('Ungültige Reihenfolge.')
  if(rows.some(row=>row.user_id!==userId))throw new Error('Keine Berechtigung.')
  unwrap(await supabase.from(table).upsert(rows.map((row,position)=>({...row,position})),{onConflict:'id'}))
}

export async function saveSessionOrder(sessionId,items) {
  unwrap(await supabase.rpc('reorder_training_session',{p_session_id:sessionId,p_items:items}))
}

export async function cancelWorkout(sessionId,userId) {
  const deleted=unwrap(await supabase.from('training_sessions')
    .delete().eq('id',sessionId).eq('user_id',userId).is('finished_at',null)
    .select('id').maybeSingle())
  if(!deleted) throw new Error('Das Training ist bereits abgeschlossen oder nicht mehr vorhanden.')
  // training_session_sets are removed by their ON DELETE CASCADE foreign key.
}

export async function removeWorkoutExercise(sessionId, exercisePosition, userId) {
  unwrap(await supabase.from('training_session_sets').delete().eq('session_id',sessionId).eq('exercise_position',exercisePosition).eq('user_id',userId))
}

export async function addWorkoutExercise(userId, sessionId, exercise, targets, position) {
  const rows = (targets.length ? targets : [{weight_kg:0,reps:10}]).map((target,index)=>({
    user_id:userId,session_id:sessionId,exercise_id:exercise.id,
    catalog_exercise_id:exercise.catalog_exercise_id,exercise_name:exercise.name,
    exercise_position:position,set_position:index,rest_seconds:exercise.rest_seconds,
    target_weight_kg:target.weight_kg,target_reps:target.reps,
  }))
  unwrap(await supabase.from('training_session_sets').insert(rows))
}

export async function finishAndApplyToPlan(sessionId) {
  unwrap(await supabase.rpc('finish_training_and_update_plan',{p_session_id:sessionId}))
}

export async function startSession(userId, plan, day, exercises, targets) {
  const session = await insert('training_sessions',{
    user_id:userId,plan_name:plan.name,day_name:day.name,
    source_plan_id:plan.id,source_day_id:day.id,
  })
  try {
    const rows = exercises.flatMap((exercise,exercisePosition) => targets.filter(t=>t.exercise_id===exercise.id).map((target,setPosition)=>({
      user_id:userId, session_id:session.id, exercise_id:exercise.id, exercise_name:exercise.name,
      catalog_exercise_id:exercise.catalog_exercise_id,
      exercise_position:exercisePosition, set_position:setPosition, rest_seconds:exercise.rest_seconds,
      target_weight_kg:target.weight_kg, target_reps:target.reps,
    })))
    if (!rows.length) throw new Error('Füge zuerst mindestens einen Satz hinzu.')
    unwrap(await supabase.from('training_session_sets').insert(rows))
    return session
  } catch(error) {
    await remove('training_sessions',session.id,userId)
    throw error
  }
}
