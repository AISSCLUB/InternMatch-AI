import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';

export default function EditProfileScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [skills, setSkills] = useState(['Python', 'ML', 'SQL']);
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');

  const removeSkill = (skill) => setSkills((prev) => prev.filter((s) => s !== skill));

  const handleSave = () => {
    // TODO: persist changes to backend / store
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-add-outline" size={26} color={colors.teal} />
        </View>
        <Text style={styles.avatarLabel}>Update Photo</Text>
      </View>

      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#8A8A8A" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Department" placeholderTextColor="#8A8A8A" value={department} onChangeText={setDepartment} />
      <TextInput style={styles.input} placeholder="University" placeholderTextColor="#8A8A8A" value={university} onChangeText={setUniversity} />
      <TouchableOpacity style={styles.input}>
        <View style={styles.gradeRow}>
          <Text style={{ color: grade ? colors.textDark : '#8A8A8A' }}>{grade || 'Grade'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Skills</Text>
      <View style={styles.chipRow}>
        {skills.map((s) => (
          <Chip key={s} label={s} variant="skill" onRemove={() => removeSkill(s)} />
        ))}
        <TouchableOpacity style={styles.addChip}>
          <Ionicons name="add" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="LinkedIn" placeholderTextColor="#8A8A8A" value={linkedin} onChangeText={setLinkedin} />
      <TextInput style={styles.input} placeholder="GitHub" placeholderTextColor="#8A8A8A" value={github} onChangeText={setGithub} />

      <GradientButton title="Save" color={colors.teal} onPress={handleSave} style={{ marginTop: 20 }} />
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
  input: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 22,
    height: 46,
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'center',
    color: colors.textDark,
  },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  addChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDEDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
