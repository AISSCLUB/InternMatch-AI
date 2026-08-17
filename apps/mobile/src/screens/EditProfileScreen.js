import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';
import { upsertProfile } from '../services/api';
import haptics from '../services/haptics';

export default function EditProfileScreen({ navigation }) {
  const { profile, setProfile } = useProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [department, setDepartment] = useState(
    typeof profile?.preferences?.department === 'string' ? profile.preferences.department : ''
  );
  const [saving, setSaving] = useState(false);

  const skills = profile?.skills || [];

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      haptics.error();
      Alert.alert('Edit Profile', 'Please enter your full name.');
      return;
    }

    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        full_name: trimmedName,
        headline: headline.trim() || (department.trim() ? department.trim() : null),
        preferences: {
          ...(profile?.preferences || {}),
          department: department.trim() || null,
        },
      };

      const updated = await upsertProfile(payload);
      setProfile(updated);
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save profile.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Edit Profile"
        showBack={true}
        navigation={navigation}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name="person-add-outline"
                size={26}
                color={colors.accent || colors.teal}
              />
            </View>
            <Text style={styles.avatarLabel}>Profile Picture</Text>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Headline</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science Student"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={headline}
            onChangeText={setHeadline}
          />

          <Text style={styles.label}>Department / Major</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Engineering"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={department}
            onChangeText={setDepartment}
          />

          {skills.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Skills (Extracted from CV)</Text>
              <View style={styles.chipRow}>
                {skills.map((s) => (
                  <Chip key={s} label={s} variant="skill" />
                ))}
              </View>
            </>
          )}

          <GradientButton
            title={saving ? "Saving..." : "Save"}
            color={colors.accent || colors.teal}
            onPress={handleSave}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.accent || colors.teal,
    backgroundColor: colors.surface || colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.xxs + 2,
    marginStart: spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    backgroundColor: colors.surface || colors.cardBg,
    borderRadius: spacing.radii.md,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
    color: colors.textPrimary || colors.textDark,
    ...typography.body,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});
