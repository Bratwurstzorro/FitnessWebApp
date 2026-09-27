import { supabase } from '../../lib/supabase'

function unwrap(result) {
  if (result.error) throw result.error
  return result.data
}

export async function loadTraining(userId) {
  const [plans, days, exercises, targets, sessions, sets] = await Promise.all([
    supabase.from('training_plans').select('*').eq('user_id',userId).order('created_at'),
    supabase.from('training_days').select('*').eq('user_id',userId).order('position'),
    supabase.from('training_exercises').select('*').eq('user_id',userId).order('position'),
    supabase.from('training_targets').select('*').eq('user_id',userId).order('position'),
    supabase.from('training_sessions').select('*').eq('user_id',userId).order('started_at',{ascending:false}),
    supabase.from('training_session_sets').select('*').eq('user_id',userId).order('exercise_position').order('set_position'),
  ])
  return {plans:unwrap(plans),days:unwrap(days),exercises:unwrap(exercises),targets:unwrap(targets),sessions:unwrap(sessions),sets:unwrap(sets)}
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

export async function removeWorkoutExercise(sessionId, exercisePosition, userId) {
  unwrap(await supabase.from('training_session_sets').delete().eq('session_id',sessionId).eq('exercise_position',exercisePosition).eq('user_id',userId))
}

export async function addWorkoutExercise(userId, sessionId, exercise, targets, position) {
  const rows = (targets.length ? targets : [{weight_kg:0,reps:10}]).map((target,index)=>({
    user_id:userId,session_id:sessionId,exercise_id:exercise.id,exercise_name:exercise.name,
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
