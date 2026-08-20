import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import GlassSurface from '../components/GlassSurface';
import { signOut, getCurrentUser, sendPasswordResetEmail } from '../services/auth';
import { useProfile } from '../context/ProfileContext';
import haptics from '../services/haptics';

const appVersion = require('../../app.json').expo.version || '1.0.0';

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showChevron = true,
  isLast = false,
  accessibilityLabel,
}) {
  const isPressable = typeof onPress === 'function';
  const Wrapper = isPressable ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.row, isLast && styles.rowLast]}
      onPress={
        isPressable
          ? () => {
              haptics.selection();
              onPress();
            }
          : undefined
      }
      activeOpacity={0.7}
      accessibilityRole={isPressable ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
    >
      <View style={styles.rowLeft}>
        {icon ? (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={18}
              color={iconColor || colors.accent || colors.teal}
            />
          </View>
        ) : null}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.valueText}>{value}</Text> : null}
        {showChevron && isPressable ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary || colors.textMuted}
            style={styles.chevron}
          />
        ) : null}
      </View>
    </Wrapper>
  );
}

export default function SettingsScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const { clearProfile } = useProfile();

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then(({ data }) => {
        if (isMounted && data?.user?.email) {
          setUserEmail(data.user.email);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch user email:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordReset = async () => {
    try {
      const email = userEmail.trim();
      if (!email) {
        Alert.alert('Change Password', 'No authenticated email address found.');
        return;
      }

      Alert.alert(
        'Change Password',
        `Send a secure password reset link to ${email}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Link',
            onPress: async () => {
              try {
                const { error } = await sendPasswordResetEmail(email);
                if (error) {
                  Alert.alert('Reset Failed', error.message);
                } else {
                  haptics.success();
                  Alert.alert(
                    'Password Reset Sent',
                    `A password reset link has been sent to ${email}. Please check your inbox.`
                  );
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unable to send reset email.';
                Alert.alert('Error', msg);
              }
            },
          },
        ]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to initiate password reset.';
      Alert.alert('Error', msg);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (signingOut) return;
          setSigningOut(true);
          try {
            const { error } = await signOut();
            if (error) {
              throw error;
            }
            clearProfile();
            haptics.success();
            navigation.reset({
              index: 0,
              routes: [{ name: 'SignIn' }],
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to sign out.';
            Alert.alert('Sign Out Failed', message);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Settings"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <GlassSurface variant="card" style={styles.glassCard}>
          <SettingsRow
            icon="school-outline"
            label="Account Type"
            value="Intern"
            showChevron={false}
          />
          <SettingsRow
            icon="mail-outline"
            label="Email Address"
            value={userEmail || 'Authenticated'}
            showChevron={false}
          />
          <SettingsRow
            icon="key-outline"
            label="Change Password"
            onPress={handlePasswordReset}
            isLast={true}
            accessibilityLabel="Send password reset link"
          />
        </GlassSurface>

        {/* Profile & Career Section */}
        <Text style={styles.sectionHeader}>PROFILE & CAREER</Text>
        <GlassSurface variant="card" style={styles.glassCard}>
          <SettingsRow
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityLabel="Navigate to Edit Profile"
          />
          <SettingsRow
            icon="document-text-outline"
            label="Manage CV / Resume"
            onPress={() => navigation.navigate('CVUpload')}
            isLast={true}
            accessibilityLabel="Navigate to CV Upload"
          />
        </GlassSurface>

        {/* Privacy & Legal Section */}
        <Text style={styles.sectionHeader}>PRIVACY & LEGAL</Text>
        <GlassSurface variant="card" style={styles.glassCard}>
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
            accessibilityLabel="Navigate to Privacy Policy"
          />
          <SettingsRow
            icon="document-outline"
            label="Terms of Use"
            onPress={() => navigation.navigate('TermsOfUse')}
            isLast={true}
            accessibilityLabel="Navigate to Terms of Use"
          />
        </GlassSurface>

        {/* About Section */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <GlassSurface variant="card" style={styles.glassCard}>
          <SettingsRow
            icon="information-circle-outline"
            label="InternMatch AI"
            value="AI Internship Matching"
            showChevron={false}
          />
          <SettingsRow
            icon="code-slash-outline"
            label="App Version"
            value={`v${appVersion}`}
            showChevron={false}
            isLast={true}
          />
        </GlassSurface>

        {/* Sign Out CTA */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
          activeOpacity={0.75}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.danger || colors.red}
            style={styles.signOutIcon}
          />
          <Text style={styles.signOutText}>
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginStart: spacing.xs,
  },
  glassCard: {
    borderRadius: spacing.radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle || 'rgba(14, 116, 144, 0.12)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginEnd: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 116, 144, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary || colors.textDark,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '500',
    maxWidth: 180,
  },
  chevron: {
    marginStart: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: spacing.radii.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    minHeight: 50,
  },
  signOutIcon: {
    marginEnd: spacing.xs,
  },
  signOutText: {
    ...typography.button,
    color: colors.danger || colors.red,
    fontWeight: '600',
  },
});
