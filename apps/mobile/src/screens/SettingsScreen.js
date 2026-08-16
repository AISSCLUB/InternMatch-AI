import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

import { signOut } from '../services/auth';
import { useProfile } from '../context/ProfileContext';

function Row({ label, right, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>Account</Text>
      <Row label="Account Type" right={<View style={styles.badge}><Ionicons name="school" size={12} color={colors.primaryBlue} /><Text style={styles.badgeText}>Intern</Text></View>} />
      <Row label="Change E-Mail" right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} onPress={() => {}} />
      <Row label="Change Password" right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} onPress={() => {}} />

      <Text style={styles.sectionTitle}>Notifications</Text>
      <Row label="New Matches" right={<Switch value={newMatches} onValueChange={setNewMatches} trackColor={{ true: colors.teal }} />} />
      <Row label="Application Status Updates" right={<Switch value={statusUpdates} onValueChange={setStatusUpdates} trackColor={{ true: colors.teal }} />} />

      <Text style={styles.sectionTitle}>Privacy & Data</Text>
      <Row label="My profile is searchable." right={<Switch value={searchable} onValueChange={setSearchable} trackColor={{ true: colors.teal }} />} />
      <Row label="Download my CV" right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} onPress={() => {}} />
      <Row label="Export My Data" right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} onPress={() => {}} />

      <Text style={styles.sectionTitle}>Preferences</Text>
      <Row label="Language" right={<Text style={styles.valueText}>English  ></Text>} onPress={() => {}} />

      <TouchableOpacity style={styles.dangerButton} onPress={handleExit}>
        <Text style={styles.dangerText}>Exit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerButton} onPress={confirmDelete}>
        <Text style={styles.dangerText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 10 },
  sectionTitle: { fontWeight: '700', color: colors.textDark, marginTop: 18, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textDark },
  valueText: { color: colors.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { marginLeft: 4, color: colors.primaryBlue, fontWeight: '600', fontSize: 12 },
  dangerButton: {
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: 22,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  dangerText: { color: colors.red, fontWeight: '700' },
});
