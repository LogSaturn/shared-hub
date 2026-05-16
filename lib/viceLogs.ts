import { supabase } from './supabase';

export interface ViceLog {
  id: string;
  user_id: string;
  vice_id: string;
  vice_label: string;
  vice_icon: string;
  quantity: number;
  logged_at: string;
}

export type ViceLogInsert = Pick<ViceLog, 'vice_id' | 'vice_label' | 'vice_icon' | 'quantity'>;

export type TimeRange = 'wtd' | 'mtd' | 'ytd' | 'all';

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function addViceLog(entry: ViceLogInsert): Promise<Result<ViceLog>> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('vice_logs')
    .insert({ ...entry, user_id: userId })
    .select('*')
    .single<ViceLog>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function getViceLogs(range: TimeRange): Promise<Result<ViceLog[]>> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Not signed in.' };

  const now = new Date();
  let from: Date | null = null;

  switch (range) {
    case 'wtd': {
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay()); // back to Sunday
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'mtd':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'ytd':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      from = null;
      break;
  }

  let query = supabase
    .from('vice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  if (from) {
    query = query.gte('logged_at', from.toISOString());
  }

  const { data, error } = await query.returns<ViceLog[]>();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

export async function deleteViceLog(id: string): Promise<Result> {
  const { error } = await supabase.from('vice_logs').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
