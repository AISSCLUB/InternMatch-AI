import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import AppChromeHeader from '../components/AppChromeHeader';
import GlassSurface from '../components/GlassSurface';
import Card from '../components/Card';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';
import { useTabScroll, useTabScrollReporter } from '../context/TabScrollContext';
import { calculateProfileCompleteness } from '../utils/profileCompleteness';

const appVersion = require('../../app.json').expo.version || '1.0.0';

function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen({ navigation }) {
  const scrollViewRef = useRef(null);
  useTabScroll('Profile', scrollViewRef);
  useScrollToTop(scrollViewRef);
  const onScroll = useTabScrollReporter(20);

  const { profile, loading, refreshProfile } = useProfile();

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch((err) => {
        console.warn('Failed to refresh profile on focus:', err);
      });
    }, [refreshProfile])
  );

  const skills = profile?.skills || [];
  const initials = getInitials(profile?.full_name);
  const completeness = calculateProfileCompleteness(profile);

  const linkedinUrl =
    typeof profile?.preferences?.linkedin_url === 'string'
      ? profile.preferences.linkedin_url
      : null;
  const githubUrl =
    typeof profile?.preferences?.github_url === 'string'
      ? profile.preferences.github_url
      : null;
  const portfolioUrl =
    typeof profile?.preferences?.portfolio_url === 'string'
      ? profile.preferences.portfolio_url
      : null;
  const hasAnyLinks = Boolean(linkedinUrl || githubUrl || portfolioUrl);

  const handleOpenLink = async (url, title) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open Link', `Cannot open the ${title} link on this device.`);
      }
    } catch {
      Alert.alert('Link Error', 'An error occurred while opening the link.');
    }
  };

  // Derive primary education summary if available
  const primaryEducation =
    profile?.education && profile.education.length > 0
      ? `${profile.education[0].degree} — ${profile.education[0].institution}`
      : null;

  const renderSettingsAction = () => (
    <TouchableOpacity
      style={styles.settingsBtn}
      onPress={() => navigation.navigate('Settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="settings-outline"
        size={22}
        color={colors.textPrimary || colors.textDark}
      />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top']}>
      {/* Dynamic App Chrome Header with FREE PLAN badge & visibly positioned settings action */}
      <AppChromeHeader
        rightAction={renderSettingsAction()}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshProfile}
            tintColor={colors.accent || colors.teal}
          />
        }
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarPlaceholder}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <Ionicons
                name="person-outline"
                size={36}
                color={colors.textSecondary || colors.textMuted}
              />
            )}
          </View>
        </View>

        {loading && !profile ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : profile ? (
          <>
            <Text style={styles.name} numberOfLines={2}>
              {profile.full_name}
            </Text>
            {profile.headline ? (
              <Text style={styles.subtitle}>{profile.headline}</Text>
            ) : null}
            {primaryEducation ? (
              <Text style={styles.subtitle}>{primaryEducation}</Text>
            ) : null}

            {/* Profile Completeness Card */}
            <GlassSurface variant="card" style={styles.completenessCard}>
              <View style={styles.completenessHeader}>
                <View style={styles.completenessTitleRow}>
                  <Ionicons
                    name={completeness.isComplete ? 'shield-checkmark' : 'sparkles'}
                    size={16}
                    color={completeness.isComplete ? colors.green || '#10B981' : colors.accent || colors.teal}
                    style={{ marginEnd: spacing.xs }}
                  />
                  <Text style={styles.completenessTitle}>
                    {completeness.isComplete
                      ? 'Profile 100% Complete'
                      : `Profile ${completeness.percentage}% complete`}
                  </Text>
                </View>
                <Text style={styles.completenessCount}>
                  {completeness.completedCount}/{completeness.totalCount}
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${completeness.percentage}%`,
                      backgroundColor: completeness.isComplete
                        ? colors.green || '#10B981'
                        : colors.accentStrong || colors.tealDark,
                    },
                  ]}
                />
              </View>

              {!completeness.isComplete && completeness.firstMissingItem ? (
                <TouchableOpacity
                  style={styles.completenessCtaRow}
                  onPress={() => navigation.navigate(completeness.firstMissingItem.route)}
                  accessibilityRole="button"
                  accessibilityLabel={`${completeness.firstMissingItem.label} to improve your profile`}
                  activeOpacity={0.7}
                >
                  <Text style={styles.completenessCtaText} numberOfLines={1}>
                    {completeness.firstMissingItem.label} to improve matching
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.accentStrong || colors.tealDark}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.completenessCompleteRow}>
                  <Text style={styles.completenessCompleteText}>
                    Profile ready for optimal internship matching
                  </Text>
                </View>
              )}
            </GlassSurface>

            {/* Skills Section */}
            <Text style={styles.sectionTitle}>Skills</Text>
            {skills.length > 0 ? (
              <View style={styles.chipRow}>
                {skills.map((s) => (
                  <Chip key={s} label={s} variant="skill" />
                ))}
              </View>
            ) : (
              <Card style={styles.linkCard} padding="sm">
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => navigation.navigate('EditProfile')}
                  accessibilityRole="button"
                  accessibilityLabel="Add your skills in Edit Profile"
                >
                  <View style={styles.linkRowLeft}>
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={colors.accent || colors.teal}
                      style={styles.linkIcon}
                    />
                    <Text style={styles.addLinksText}>Add your skills</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary || colors.textMuted}
                  />
                </TouchableOpacity>
              </Card>
            )}

            {/* Functional Social & Portfolio Links */}
            <Text style={styles.sectionTitle}>Links</Text>
            <Card style={styles.linkCard} padding="sm">
              {hasAnyLinks ? (
                <>
                  {linkedinUrl ? (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => handleOpenLink(linkedinUrl, 'LinkedIn')}
                      accessibilityRole="link"
                      accessibilityLabel="Open LinkedIn Profile"
                    >
                      <View style={styles.linkRowLeft}>
                        <Ionicons
                          name="logo-linkedin"
                          size={18}
                          color={colors.accent || colors.teal}
                          style={styles.linkIcon}
                        />
                        <Text style={styles.linkText}>LinkedIn</Text>
                      </View>
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.textTertiary || colors.textMuted}
                      />
                    </TouchableOpacity>
                  ) : null}

                  {githubUrl ? (
                    <TouchableOpacity
                      style={[styles.linkRow, linkedinUrl ? styles.linkRowBorder : null]}
                      onPress={() => handleOpenLink(githubUrl, 'GitHub')}
                      accessibilityRole="link"
                      accessibilityLabel="Open GitHub Profile"
                    >
                      <View style={styles.linkRowLeft}>
                        <Ionicons
                          name="logo-github"
                          size={18}
                          color={colors.accent || colors.teal}
                          style={styles.linkIcon}
                        />
                        <Text style={styles.linkText}>GitHub</Text>
                      </View>
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.textTertiary || colors.textMuted}
                      />
                    </TouchableOpacity>
                  ) : null}

                  {portfolioUrl ? (
                    <TouchableOpacity
                      style={[
                        styles.linkRow,
                        linkedinUrl || githubUrl ? styles.linkRowBorder : null,
                      ]}
                      onPress={() => handleOpenLink(portfolioUrl, 'Portfolio')}
                      accessibilityRole="link"
                      accessibilityLabel="Open Portfolio Website"
                    >
                      <View style={styles.linkRowLeft}>
                        <Ionicons
                          name="globe-outline"
                          size={18}
                          color={colors.accent || colors.teal}
                          style={styles.linkIcon}
                        />
                        <Text style={styles.linkText}>Portfolio</Text>
                      </View>
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.textTertiary || colors.textMuted}
                      />
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => navigation.navigate('EditProfile')}
                  accessibilityRole="button"
                  accessibilityLabel="Add LinkedIn, GitHub, or Portfolio in Edit Profile"
                >
                  <View style={styles.linkRowLeft}>
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={colors.accent || colors.teal}
                      style={styles.linkIcon}
                    />
                    <Text style={styles.addLinksText}>Add LinkedIn, GitHub, or Portfolio</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary || colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </Card>

            <View style={styles.buttonRow}>
              <GradientButton
                title="Edit Profile"
                color={colors.accent || colors.teal}
                onPress={() => navigation.navigate('EditProfile')}
                style={styles.actionBtn}
              />
              <GradientButton
                title="Upload CV"
                color={colors.primary || colors.blue}
                onPress={() => navigation.navigate('CVUpload')}
                style={styles.actionBtn}
              />
            </View>

            {/* Legal & About Section */}
            <Text style={styles.sectionTitle}>Legal & About</Text>
            <Card style={styles.linkCard} padding="sm">
              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => navigation.navigate('PrivacyPolicy')}
                accessibilityRole="button"
                accessibilityLabel="Privacy Policy"
              >
                <View style={styles.legalRowLeft}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={colors.accent || colors.teal}
                    style={styles.linkIcon}
                  />
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary || colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.legalRow, styles.linkRowBorder]}
                onPress={() => navigation.navigate('TermsOfUse')}
                accessibilityRole="button"
                accessibilityLabel="Terms of Use"
              >
                <View style={styles.legalRowLeft}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.accent || colors.teal}
                    style={styles.linkIcon}
                  />
                  <Text style={styles.linkText}>Terms of Use</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary || colors.textMuted}
                />
              </TouchableOpacity>

              <View style={[styles.legalRow, styles.linkRowBorder]}>
                <View style={styles.legalRowLeft}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.textSecondary || colors.textMuted}
                    style={styles.linkIcon}
                  />
                  <Text style={styles.linkText}>App Version</Text>
                </View>
                <Text style={styles.versionText}>{appVersion}</Text>
              </View>
            </Card>
          </>
        ) : (
          <Card style={styles.emptyWrap} padding="lg">
            <Text style={styles.name}>No Profile Yet</Text>
            <Text style={styles.subtitle}>
              Create your profile to start matching with internships.
            </Text>
            <GradientButton
              title="Create Profile"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('EditProfile')}
              style={{ marginTop: spacing.lg, width: '100%' }}
            />
          </Card>
        )}
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
    paddingBottom: 104,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 116, 144, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.accent || colors.teal,
    backgroundColor: colors.surface || colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(14, 116, 144, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    ...typography.display,
    fontSize: 26,
    fontWeight: '700',
    color: colors.accentStrong || colors.tealDark,
  },
  name: {
    ...typography.cardTitle,
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.textPrimary || colors.textDark,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
    lineHeight: 18,
  },
  completenessCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: spacing.radii.lg,
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  completenessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completenessTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary || colors.textDark,
  },
  completenessCount: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary || colors.textMuted,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(14, 116, 144, 0.12)',
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  completenessCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  completenessCtaText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
    flex: 1,
    marginEnd: spacing.xs,
  },
  completenessCompleteRow: {
    marginTop: spacing.xxs,
  },
  completenessCompleteText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '500',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  linkCard: {
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  linkRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
  },
  linkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    marginEnd: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.textPrimary || colors.textDark,
  },
  addLinksText: {
    ...typography.body,
    color: colors.accentStrong || colors.tealDark,
    fontWeight: '500',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  legalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: spacing.xxs,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.sm,
  },
  emptyWrap: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    textAlign: 'center',
  },
});
