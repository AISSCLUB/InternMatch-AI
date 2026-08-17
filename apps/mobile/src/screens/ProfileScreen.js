import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import AppChromeHeader from '../components/AppChromeHeader';
import Card from '../components/Card';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';
import { useTabScroll, useTabScrollReporter } from '../context/TabScrollContext';

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
  const education = profile?.education || [];
  const primaryEducation =
    education.length > 0
      ? `${education[0].institution}${education[0].degree ? ` · ${education[0].degree}` : ''}`
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
      <AppChromeHeader />
      <ScreenHeader
        title="Profile"
        alignment="start"
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
            <Ionicons
              name="person-outline"
              size={36}
              color={colors.textSecondary || colors.textMuted}
            />
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

            {skills.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.chipRow}>
                  {skills.map((s) => (
                    <Chip key={s} label={s} variant="skill" />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Links</Text>
            <Card style={styles.linkCard} padding="sm">
              <View style={styles.linkRow}>
                <Ionicons
                  name="link-outline"
                  size={16}
                  color={colors.textSecondary || colors.textMuted}
                  style={styles.linkIcon}
                />
                <Text style={styles.linkText}>LinkedIn</Text>
              </View>
              <View style={[styles.linkRow, styles.linkRowBorder]}>
                <Ionicons
                  name="link-outline"
                  size={16}
                  color={colors.textSecondary || colors.textMuted}
                  style={styles.linkIcon}
                />
                <Text style={styles.linkText}>GitHub</Text>
              </View>
            </Card>

            <GradientButton
              title="Edit Profile"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('EditProfile')}
              style={{ marginTop: spacing.xl }}
            />
            <GradientButton
              title="CV Upload"
              color={colors.accentStrong || colors.tealDark}
              onPress={() => navigation.navigate('CVUpload')}
              style={{ marginTop: spacing.md }}
            />
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
    width: spacing.minimumTouchTarget,
    height: spacing.minimumTouchTarget,
    alignItems: 'flex-end',
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
    borderColor: colors.borderSubtle || colors.border,
    backgroundColor: colors.surface || colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: spacing.sm,
  },
  linkRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
  },
  linkIcon: {
    marginEnd: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.textPrimary || colors.textDark,
  },
  loadingWrap: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textSecondary || colors.textMuted,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
