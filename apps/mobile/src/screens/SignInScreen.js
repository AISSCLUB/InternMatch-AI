import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradientColors, colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import GradientButton from '../components/GradientButton';
import { signInWithGoogle } from '../services/googleAuth';
import { signInWithEmail } from '../services/auth';
import { syncAuthenticatedUser, upsertProfile } from '../services/api';
import { useProfile } from '../context/ProfileContext';
import haptics from '../services/haptics';

export default function SignInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshProfile, setProfile } = useProfile();

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      haptics.error();
      Alert.alert('Sign in', 'Please enter your email and password.');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { data, error } = await signInWithEmail(normalizedEmail, password);

      if (error) {
        throw error;
      }

      if (!data.session?.access_token) {
        throw new Error('Authentication succeeded but no active session was returned.');
      }

      const syncResult = await syncAuthenticatedUser();
      if (syncResult.has_profile) {
        await refreshProfile();
        navigation.replace('MainTabs');
      } else {
        const meta = data.session?.user?.user_metadata || {};
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
            navigation.replace('MainTabs');
          } catch (createErr) {
            console.warn('Failed to bootstrap profile from metadata:', createErr);
            throw createErr;
          }
        } else {
          navigation.replace('OnboardingProfile');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      Alert.alert('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      Alert.alert('Google Sign-In', 'Google Sign-In is not available in this build yet.');
    } catch (e) {
      console.warn('Google sign-in failed', e);
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Welcome</Text>

          <View style={styles.tabRow}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabActiveText}>Sign In</Text>
            </View>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.replace('SignUp')}
              accessibilityRole="button"
              accessibilityLabel="Switch to Sign Up"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.tabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="rgba(22, 35, 46, 0.5)"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="rgba(22, 35, 46, 0.5)"
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="I forgot my password"
          >
            <Text style={styles.forgot}>I forgot my password</Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? "Signing in..." : "Continue"}
            color={colors.primaryBlue}
            onPress={handleContinue}
            style={{ marginTop: spacing.xl }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <GradientButton
            title="by Google"
            color={colors.white}
            textColor={colors.textDark}
            onPress={handleGoogle}
          />
          <GradientButton
            title="by Apple"
            color={colors.white}
            textColor={colors.textDark}
            onPress={() => {}}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
  },
  title: {
    ...typography.display,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginEnd: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primaryBlue,
  },
  tabActiveText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  tabText: {
    ...typography.button,
    color: colors.textDark,
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: spacing.radii.md,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    color: colors.textDark,
    ...typography.body,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  forgot: {
    ...typography.caption,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dividerText: {
    ...typography.caption,
    color: colors.white,
    marginHorizontal: spacing.md,
  },
});
