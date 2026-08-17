import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import { signOut } from '../services/auth';
import { useProfile } from '../context/ProfileContext';

function Row({ label, right, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </Wrapper>
  );
}

export default function SettingsScreen({ navigation }) {
  const [newMatches, setNewMatches] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [searchable, setSearchable] = useState(false);
  const { clearProfile } = useProfile();

  const handleExit = async () => {
    try {
      const { error } = await signOut();

      if (error) {
        throw error;
      }

      clearProfile();
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out.';
      Alert.alert('Sign out failed', message);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete Account', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {} },
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
        <Text style={styles.sectionTitle}>Account</Text>
        <Row
          label="Account Type"
          right={
            <View style={styles.badge}>
              <Ionicons
                name="school"
                size={12}
                color={colors.info || colors.primaryBlue}
                style={styles.badgeIcon}
              />
              <Text style={styles.badgeText}>Intern</Text>
            </View>
          }
        />
        <Row
          label="Change E-Mail"
          right={
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary || colors.textMuted}
            />
          }
          onPress={() => {}}
        />
        <Row
          label="Change Password"
          right={
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary || colors.textMuted}
            />
          }
          onPress={() => {}}
        />

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Row
          label="New Matches"
          right={
            <Switch
              value={newMatches}
              onValueChange={setNewMatches}
              trackColor={{ true: colors.accent || colors.teal }}
            />
          }
        />
        <Row
          label="Application Status Updates"
          right={
            <Switch
              value={statusUpdates}
              onValueChange={setStatusUpdates}
              trackColor={{ true: colors.accent || colors.teal }}
            />
          }
        />

        <Text style={styles.sectionTitle}>Privacy & Data</Text>
        <Row
          label="My profile is searchable"
          right={
            <Switch
              value={searchable}
              onValueChange={setSearchable}
              trackColor={{ true: colors.accent || colors.teal }}
            />
          }
        />
        <Row
          label="Download my CV"
          right={
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary || colors.textMuted}
            />
          }
          onPress={() => {}}
        />
        <Row
          label="Export My Data"
          right={
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary || colors.textMuted}
            />
          }
          onPress={() => {}}
        />

        <Text style={styles.sectionTitle}>Preferences</Text>
        <Row
          label="Language"
          right={<Text style={styles.valueText}>{'English  >'}</Text>}
          onPress={() => {}}
        />

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleExit}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
        >
          <Text style={styles.dangerText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerButton, styles.deleteButton]}
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
        >
          <Text style={styles.dangerText}>Delete Account</Text>
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
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle || colors.border,
    minHeight: spacing.minimumTouchTarget,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary || colors.textDark,
  },
  valueText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
    borderRadius: spacing.radii.sm,
  },
  badgeIcon: {
    marginEnd: spacing.xxs + 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.info || colors.primaryBlue,
    fontWeight: '600',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger || colors.red,
    borderRadius: spacing.radii.md,
    minHeight: spacing.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    backgroundColor: colors.surface || colors.cardBg,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
  dangerText: {
    ...typography.button,
    color: colors.danger || colors.red,
  },
});
