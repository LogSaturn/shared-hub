import { supabase } from './supabase';
import { parse, serialize } from './searchConfig';
import type { SearchConfig } from '../types/search';

export interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  config: SearchConfig;
  position: number;
  created_at: string;
  last_used_at: string | null;
}

export type SavedResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface RawRow {
  id: string;
  user_id: string;
  name: string;
  config: unknown;
  position: number;
  created_at: string;
  last_used_at: string | null;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function hydrate(row: RawRow): SavedSearchRow | null {
  const cfg = parse(row.config);
  if (!cfg) return null;
  return { ...row, config: cfg };
}

export async function listSavedSearches(): Promise<SavedResult<SavedSearchRow[]>> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: [] };

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  const rows = ((data ?? []) as RawRow[])
    .map(hydrate)
    .filter((r): r is SavedSearchRow => r !== null);
  return { ok: true, data: rows };
}

export async function addSavedSearch(args: {
  name: string;
  config: SearchConfig;
  position?: number;
}): Promise<SavedResult<SavedSearchRow>> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to save searches.' };

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: userId,
      name: args.name.trim(),
      config: serialize(args.config),
      position: args.position ?? 0,
    })
    .select('*')
    .single<RawRow>();

  if (error || !data) return { ok: false, error: error?.message ?? 'insert failed' };
  const hydrated = hydrate(data);
  if (!hydrated) return { ok: false, error: 'config failed to parse after insert' };
  return { ok: true, data: hydrated };
}

export async function removeSavedSearch(id: string): Promise<SavedResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to manage saved searches.' };

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// Mark a saved search as just-used. Callers should fire-and-forget — there
// is no UI surface that depends on this completing synchronously.
export async function touchSavedSearch(id: string): Promise<SavedResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: undefined };

  const { error } = await supabase
    .from('saved_searches')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function renameSavedSearch(
  id: string,
  name: string,
): Promise<SavedResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to rename saved searches.' };

  const { error } = await supabase
    .from('saved_searches')
    .update({ name: name.trim() })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function reorderSavedSearches(
  ordered: { id: string; position: number }[],
): Promise<SavedResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to reorder saved searches.' };

  // Sequential updates — small N, RLS-checked per row. Postgres upsert isn't
  // a fit here because we'd have to construct a full row including config.
  for (const row of ordered) {
    const { error } = await supabase
      .from('saved_searches')
      .update({ position: row.position })
      .eq('user_id', userId)
      .eq('id', row.id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
