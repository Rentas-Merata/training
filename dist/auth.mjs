import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://oteqzgxndcwgxgmvlejs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7akoEUZ4EemsV2o2KfU2NQ_jT6ga3AM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}

export async function requestEmailOtp(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
}

export async function verifyEmailOtp(email, token) {
  return supabase.auth.verifyOtp({ email, token, type: 'email' });
}

export async function saveProfile(profile) {
  return supabase.auth.updateUser({ data: { display_name: profile.name, running_goal: profile.goal } });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function saveProgram(userId, profile, plan, durationWeeks) {
  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: userId, display_name: profile.name || null, level: profile.level,
    goal: profile.goal, hr_method: profile.hr_method || null, age: profile.age || null,
    max_hr: profile.max_hr || null, resting_hr: profile.resting_hr || null,
    training_days: profile.training_days || []
  });
  if (profileError) throw profileError;
  await supabase.from('active_programs').update({ status: 'paused' }).eq('user_id', userId).eq('status', 'active');
  const { data: program, error } = await supabase.from('active_programs').insert({ user_id: userId, level: profile.level, goal: profile.goal, duration_weeks: durationWeeks }).select().single();
  if (error) throw error;
  const start = new Date(`${program.start_date}T00:00:00Z`);
  const weeks = Array.from({length: durationWeeks}, (_, i) => {
    const from = new Date(start); from.setUTCDate(from.getUTCDate() + i * 7);
    const to = new Date(from); to.setUTCDate(to.getUTCDate() + 6);
    return { program_id: program.id, week_number: i + 1, start_date: from.toISOString().slice(0,10), end_date: to.toISOString().slice(0,10), plan: { ...plan, week_number: i + 1 }, status: i === 0 ? 'current' : 'locked', total_sessions: profile.training_days?.length || plan.days };
  });
  const { error: weekError } = await supabase.from('program_weeks').insert(weeks);
  if (weekError) throw weekError;
  return program;
}

export async function getActiveProgram(userId) {
  const { data, error } = await supabase.from('active_programs').select('*, program_weeks(*)').eq('user_id', userId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
