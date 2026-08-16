import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';
import { upsertProfile } from '../services/api';

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-add-outline" size={26} color={colors.teal} />
        </View>
        <Text style={styles.avatarLabel}>Profile Picture</Text>
      </View>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#8A8A8A"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Headline</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Computer Science Student"
        placeholderTextColor="#8A8A8A"
        value={headline}
        onChangeText={setHeadline}
      />

      <Text style={styles.label}>Department / Major</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Computer Engineering"
        placeholderTextColor="#8A8A8A"
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
        color={colors.teal}
        onPress={handleSave}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textDark, marginBottom: 4, marginLeft: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 22,
    height: 46,
    paddingHorizontal: 16,
    marginBottom: 14,
    justifyContent: 'center',
    color: colors.textDark,
  },
  sectionTitle: { fontWeight: '700', color: colors.textDark, marginTop: 8, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
});
