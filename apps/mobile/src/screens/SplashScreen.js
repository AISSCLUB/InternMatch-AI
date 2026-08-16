import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradientColors, colors } from '../theme/colors';
import { getCurrentSession, signOut } from '../services/auth';
import { syncAuthenticatedUser, upsertProfile, ApiError } from '../services/api';
import { useProfile } from '../context/ProfileContext';

export default function SplashScreen({ navigation }) {
  const { refreshProfile, setProfile, clearProfile } = useProfile();
  const [checking, setChecking] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSessionAndRoute() {
      setChecking(true);
      setConnectionError(false);
      try {
        const { data, error } = await getCurrentSession();

        if (error || !data?.session?.access_token) {
          if (isMounted) navigation.replace('SignIn');
          return;
        }

        // Active session exists; sync with backend
        const syncResult = await syncAuthenticatedUser();

        if (syncResult.has_profile) {
          await refreshProfile();
          if (isMounted) navigation.replace('MainTabs');
          return;
        }

        // Profile missing; attempt bootstrap from user metadata
        const user = data.session.user;
        const meta = user?.user_metadata || {};
        const metaName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
        const metaDept = typeof meta.department === 'string' ? meta.department.trim() : '';
        const metaAccountType = meta.account_type === 'employer' ? 'employer' : 'intern';

        if (metaName) {
          try {
            const created = await upsertProfile({
              full_name: metaName,
              headline: null,
              preferences: {
                account_type: metaAccountType,
                department: metaDept || null,
              },
            });
            setProfile(created);
            if (isMounted) navigation.replace('MainTabs');
          } catch (createErr) {
            console.warn('Metadata bootstrap failed on splash:', createErr);
            throw createErr;
          }
        } else {
          if (isMounted) navigation.replace('OnboardingProfile');
        }
      } catch (err) {
        console.warn('Session restoration failed on splash:', err);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try {
            await signOut();
          } catch (_) {}
          clearProfile();
          if (isMounted) navigation.replace('SignIn');
        } else {
          // A valid Supabase session may still exist while the API/network is unavailable.
          // Preserve authentication and allow the user to retry profile resolution.
          if (isMounted) setConnectionError(true);
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    checkSessionAndRoute();

    return () => {
      isMounted = false;
    };
  }, [navigation, refreshProfile, setProfile, clearProfile, retryNonce]);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <View style={styles.center}>
        <View style={styles.logoRow}>
          <Text style={styles.logo}>InternMatch</Text>
          <Ionicons name="locate" size={26} color={colors.white} style={{ marginLeft: 6 }} />
        </View>
        <Text style={styles.tagline}>Right Internship, Bright Future</Text>
        {checking && !connectionError && (
          <ActivityIndicator size="small" color={colors.white} style={{ marginTop: 24 }} />
        )}

        {connectionError && (
          <View style={styles.retryBox}>
            <Text style={styles.retryText}>We couldn't reach InternMatch services.</Text>
            <Text style={styles.retrySubtext}>Your signed-in session is preserved.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setRetryNonce((value) => value + 1)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.white,
  },
  retryBox: { alignItems: 'center', marginTop: 24, paddingHorizontal: 32 },
  retryText: { color: colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  retrySubtext: { color: colors.white, opacity: 0.8, fontSize: 12, marginTop: 6, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)' },
  retryButtonText: { color: colors.white, fontWeight: '700' },
  tagline: {
    marginTop: 12,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
