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
import { gradientColors, colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { upsertProfile } from '../services/api';
import { useProfile } from '../context/ProfileContext';

export default function OnboardingProfileScreen({ navigation, route }) {
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Please set up your profile details before exploring internship opportunities.
          </Text>

          <Text style={styles.sectionLabel}>Account type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'intern' && styles.typeButtonActive]}
              onPress={() => setAccountType('intern')}
            >
              <Ionicons name="school" size={16} color={accountType === 'intern' ? colors.white : colors.textDark} />
              <Text style={[styles.typeText, accountType === 'intern' && styles.typeTextActive]}>Intern</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'employer' && styles.typeButtonActive]}
              onPress={() => setAccountType('employer')}
            >
              <Ionicons name="briefcase" size={16} color={accountType === 'employer' ? colors.white : colors.textDark} />
              <Text style={[styles.typeText, accountType === 'employer' && styles.typeTextActive]}>Employer</Text>
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
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 24, lineHeight: 18 },
  sectionLabel: { color: colors.white, fontWeight: '600', marginBottom: 8, fontSize: 12 },
  typeRow: { flexDirection: 'row', marginBottom: 18 },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 10,
  },
  typeButtonActive: { backgroundColor: colors.primaryBlue },
  typeText: { marginLeft: 6, color: colors.textDark, fontWeight: '600' },
  typeTextActive: { color: colors.white },
  label: { color: colors.white, fontWeight: '600', marginBottom: 6, marginTop: 10, fontSize: 12 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
  },
});
