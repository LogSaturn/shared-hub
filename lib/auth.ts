import * as Linking from 'expo-linking';
import type { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Where Supabase will redirect the user after they click a magic-link email.
// Must be whitelisted in Supabase dashboard → Authentication → URL Configuration.
// In dev (Expo Go) this resolves to exp://...; in a standalone build it's vice://.
function authRedirectUrl() {
  return Linking.createURL('auth/callback');
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult<Session>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.session) return failed(error, 'Could not sign in.');
  return { ok: true, data: data.session };
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<AuthResult<{ session: Session | null; needsConfirmation: boolean }>> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) return failed(error, 'Could not create account.');
  // If email confirmation is required, session will be null until the user
  // clicks the link. Caller should route to /check-email in that case.
  return {
    ok: true,
    data: { session: data.session, needsConfirmation: data.session === null },
  };
}

export async function signInWithMagicLink(
  email: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });
  if (error) return failed(error, 'Could not send magic link.');
  return { ok: true, data: undefined };
}

// Used by native Apple/Google sign-in once those packages are wired.
// The caller obtains an idToken via expo-apple-authentication /
// expo-auth-session and hands it off here.
export async function signInWithIdToken(
  provider: 'apple' | 'google',
  idToken: string,
  nonce?: string,
): Promise<AuthResult<Session>> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token: idToken,
    nonce,
  });
  if (error || !data.session) return failed(error, `Could not sign in with ${provider}.`);
  return { ok: true, data: data.session };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) return failed(error, 'Could not sign out.');
  return { ok: true, data: undefined };
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Called when the app is opened by a magic-link URL like
// vice://auth/callback?code=...  (PKCE flow). Returns a session on success.
export async function exchangeCodeForSession(
  url: string,
): Promise<AuthResult<Session>> {
  const code = new URL(url).searchParams.get('code');
  if (!code) return { ok: false, error: 'Missing code in callback URL.' };
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return failed(error, 'Could not complete sign-in.');
  return { ok: true, data: data.session };
}

function failed(
  error: AuthError | null,
  fallback: string,
): { ok: false; error: string } {
  return { ok: false, error: error?.message ?? fallback };
}
