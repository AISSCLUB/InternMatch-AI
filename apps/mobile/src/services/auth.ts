import {
  AuthResponse,
  AuthTokenResponsePassword,
  UserResponse,
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type SignUpMetadata = {
  full_name?: string;
  department?: string;
  account_type?: string;
  [key: string]: unknown;
};

/**
 * Classifies whether an auth error represents an unconfirmed email error.
 */
export function isEmailNotConfirmedError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    if (errObj.code === 'email_not_confirmed') {
      return true;
    }
    const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
    if (message.includes('email not confirmed')) {
      return true;
    }
  }
  return false;
}

/**
 * Classifies whether an auth error represents a rate limit / throttling error.
 */
export function isAuthRateLimitError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    if (errObj.status === 429) {
      return true;
    }
    if (
      errObj.code === 'over_email_send_rate_limit' ||
      errObj.code === 'rate_limit'
    ) {
      return true;
    }
    const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
    if (
      message.includes('over_email_send_rate_limit') ||
      message.includes('rate limit') ||
      message.includes('rate_limit') ||
      message.includes('too many requests')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Sign up a new user using email and password credentials via Supabase Auth.
 * Accepts optional user metadata (e.g. full_name, department, account_type) for bootstrap.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: SignUpMetadata
): Promise<AuthResponse> {
  return await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
}

/**
 * Resend the signup confirmation email to the specified user email address.
 * Uses pure Supabase auth.resend without custom redirect URL.
 */
export async function resendSignupConfirmation(email: string) {
  return await supabase.auth.resend({
    type: 'signup',
    email,
  });
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
