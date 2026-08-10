import {
  AuthResponse,
  AuthTokenResponsePassword,
  UserResponse,
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Sign up a new user using email and password credentials via Supabase Auth.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  return await supabase.auth.signUp({ email, password });
}

/**
 * Sign in an existing user using email and password credentials via Supabase Auth.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthTokenResponsePassword> {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Sign out the currently authenticated user and clear session tokens.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  return await supabase.auth.signOut();
}

/**
 * Retrieve the current active Supabase authentication session object.
 */
export async function getCurrentSession() {
  return await supabase.auth.getSession();
}

/**
 * Retrieve the current authenticated user identity details from Supabase Auth.
 */
export async function getCurrentUser(): Promise<UserResponse> {
  return await supabase.auth.getUser();
}

/**
 * Send a password-reset email to the specified user email address.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo?: string
) {
  return await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined
  );
}

/**
 * Update the password credential for the currently authenticated active session.
 */
export async function updatePassword(password: string): Promise<UserResponse> {
  return await supabase.auth.updateUser({ password });
}
