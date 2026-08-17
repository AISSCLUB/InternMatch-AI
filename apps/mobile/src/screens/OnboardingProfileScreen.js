import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradientColors, colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import GradientButton from '../components/GradientButton';
import { upsertProfile } from '../services/api';
import { useProfile } from '../context/ProfileContext';

export default function OnboardingProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialName = typeof route?.params?.initialName === 'string' ? route.params.initialName : '';
  const initialDepartment = typeof route?.params?.initialDepartment === 'string' ? route.params.initialDepartment : '';
  const initialAccountType = route?.params?.initialAccountType === 'employer' ? 'employer' : 'intern';

  const [accountType, setAccountType] = useState(initialAccountType);
  const [fullName, setFullName] = useState(initialName);
  const [department, setDepartment] = useState(initialDepartment);
  const [headline, setHeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const { setProfile } = useProfile();

  const handleComplete = async () => {
    const trimmedName = fullName.trim();
    const trimmedDepartment = department.trim();
    const trimmedHeadline = headline.trim() || null;

    if (!trimmedName) {
      Alert.alert('Profile Setup', 'Please enter your full name.');
      return;
    }

    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        full_name: trimmedName,
        headline: trimmedHeadline,
        preferences: {
          account_type: accountType,
          department: trimmedDepartment || null,
        },
      };

      const created = await upsertProfile(payload);
      setProfile(created);
      navigation.replace('MainTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save profile.';
      Alert.alert('Setup Failed', message);
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Please set up your profile details before exploring internship opportunities.
          </Text>

          <Text style={styles.sectionLabel}>Account type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'intern' && styles.typeButtonActive]}
              onPress={() => setAccountType('intern')}
              accessibilityRole="button"
              accessibilityLabel="Account type: Intern"
            >
              <Ionicons
                name="school"
                size={16}
                color={accountType === 'intern' ? colors.white : colors.textDark}
              />
              <Text style={[styles.typeText, accountType === 'intern' && styles.typeTextActive]}>
                Intern
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'employer' && styles.typeButtonActive]}
              onPress={() => setAccountType('employer')}
              accessibilityRole="button"
              accessibilityLabel="Account type: Employer"
            >
              <Ionicons
                name="briefcase"
                size={16}
                color={accountType === 'employer' ? colors.white : colors.textDark}
              />
              <Text style={[styles.typeText, accountType === 'employer' && styles.typeTextActive]}>
                Employer
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jane Doe"
            placeholderTextColor="#8A8A8A"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Department / Major</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science"
            placeholderTextColor="#8A8A8A"
            value={department}
            onChangeText={setDepartment}
          />

          <Text style={styles.label}>Headline / Short Bio</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Aspiring AI & Backend Intern"
            placeholderTextColor="#8A8A8A"
            value={headline}
            onChangeText={setHeadline}
          />

          <GradientButton
            title={saving ? "Saving profile..." : "Save & Continue"}
            color={colors.primaryBlue}
            onPress={handleComplete}
            style={{ marginTop: spacing.xl }}
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
    fontSize: 24,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginEnd: spacing.sm,
    minHeight: 40,
  },
  typeButtonActive: {
    backgroundColor: colors.primaryBlue,
  },
  typeText: {
    marginStart: spacing.xs + 2,
    color: colors.textDark,
    ...typography.button,
    fontSize: 13,
  },
  typeTextActive: {
    color: colors.white,
  },
  label: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
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
});
