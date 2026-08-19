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
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import InternMatchLogo from '../components/InternMatchLogo';
import AuthGlassPanel from '../components/AuthGlassPanel';
import AuthSegmentedControl from '../components/AuthSegmentedControl';
import SocialAuthButton from '../components/SocialAuthButton';
import GradientButton from '../components/GradientButton';
import PressableScale from '../components/PressableScale';
import motionTokens from '../motion/motionTokens';
import { signInWithGoogle } from '../services/googleAuth';
import { signInWithEmail } from '../services/auth';
import { syncAuthenticatedUser, upsertProfile } from '../services/api';
import { useProfile } from '../context/ProfileContext';
import haptics from '../services/haptics';

export default function SignInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const { refreshProfile, setProfile } = useProfile();

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      haptics.error();
      Alert.alert('Sign In', 'Please enter your email and password.');
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
      Alert.alert('Google Sign-In', 'Google Sign-In is not available in this build yet.');
    }
  };

  const handleApple = () => {
    Alert.alert('Apple Sign-In', 'Apple Sign-In is not available in this build yet.');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Password reset instructions will be sent to your registered email address.'
    );
  };

  return (
    <LinearGradient
      colors={['#DBF1F5', '#EAF6F8', '#E3F4F6']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + spacing.md,
              paddingBottom: Math.max(insets.bottom, 20) + spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Logo Zone */}
          <View style={styles.brandZone}>
            <InternMatchLogo style={styles.brandLogo} />
          </View>

          {/* Heading Zone */}
          <View style={styles.headingZone}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your internship matches
            </Text>
          </View>

          {/* Glass Authentication Panel */}
          <AuthGlassPanel style={styles.authPanel}>
            {/* Segmented Control */}
            <AuthSegmentedControl
              activeTab="signIn"
              onTabChange={(tab) => {
                if (tab === 'signUp') {
                  navigation.replace('SignUp');
                }
              }}
            />

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-Mail</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor="rgba(22, 35, 46, 0.40)"
                accessibilityLabel="Email address input"
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused,
                ]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="rgba(22, 35, 46, 0.40)"
                accessibilityLabel="Password input"
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>I forgot my password</Text>
            </TouchableOpacity>

            {/* Primary CTA */}
            <GradientButton
              title={loading ? 'Signing in...' : 'Sign In'}
              color={colors.accent || colors.teal}
              onPress={handleContinue}
              disabled={loading}
              style={styles.primaryCta}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Social Providers */}
            <SocialAuthButton
              provider="google"
              onPress={handleGoogle}
            />
            <SocialAuthButton
              provider="apple"
              onPress={handleApple}
              style={{ marginTop: spacing.md }}
            />

            {/* Legal Footer inside Panel */}
            <View style={styles.legalFooter}>
              <PressableScale
                onPress={() => navigation.navigate('PrivacyPolicy')}
                scaleTo={motionTokens.scales.chipPressed}
                activeOpacity={motionTokens.opacities.pressed}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel="Privacy Policy"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </PressableScale>

              <Text style={styles.legalDot}>·</Text>

              <PressableScale
                onPress={() => navigation.navigate('TermsOfUse')}
                scaleTo={motionTokens.scales.chipPressed}
                activeOpacity={motionTokens.opacities.pressed}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel="Terms of Use"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.legalLink}>Terms of Use</Text>
              </PressableScale>
            </View>
          </AuthGlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    alignItems: 'center',
  },
  brandZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brandLogo: {
    alignSelf: 'center',
  },
  headingZone: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  title: {
    ...typography.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary || colors.textDark,
    textAlign: 'center',
    fontWeight: '800',
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  authPanel: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.radii.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 116, 144, 0.16)',
    color: colors.textDark,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.accent || colors.teal,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.accent || colors.teal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xxs,
    minHeight: 28,
  },
  forgotText: {
    ...typography.caption,
    color: colors.accentStrong || colors.tealDark,
    fontWeight: '600',
  },
  primaryCta: {
    marginTop: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(14, 116, 144, 0.15)',
  },
  dividerText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  legalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.sm,
  },
  legalLink: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '500',
  },
  legalDot: {
    marginHorizontal: spacing.sm,
    color: colors.textTertiary || colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
