// Google Sign-In requires native configuration and an Expo development build.
// Keep this boundary callable by the UI until native Google OAuth is configured.

export async function signInWithGoogle() {
  throw new Error(
    'Google Sign-In is not configured yet. Use email/password authentication for now.'
  );
}

export async function signOutGoogle() {
  return;
}
