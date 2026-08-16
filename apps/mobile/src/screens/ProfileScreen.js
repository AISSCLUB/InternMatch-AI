import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';

const MOCK_PROFILE = {
  name: 'Aiss Club',
  subtitle: 'Computer Engineering, 3rd grade',
  university: 'ÃœskÃ¼dar Ãœniversitesi',
  skills: ['Python', 'ML', 'SQL'],
  avatar: null,
};

export default function ProfileScreen({ navigation }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarWrap}>
        {MOCK_PROFILE.avatar ? (
          <Image source={{ uri: MOCK_PROFILE.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={36} color={colors.textMuted} />
          </View>
        )}
      </View>

      <Text style={styles.name}>{MOCK_PROFILE.name}</Text>
      <Text style={styles.subtitle}>{MOCK_PROFILE.subtitle}</Text>
      <Text style={styles.subtitle}>{MOCK_PROFILE.university}</Text>

      <Text style={styles.sectionTitle}>Skills</Text>
      <View style={styles.chipRow}>
        {MOCK_PROFILE.skills.map((s) => (
          <Chip key={s} label={s} variant="skill" />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Links</Text>
      <View style={styles.linkRow}>
        <Ionicons name="link-outline" size={16} color={colors.textMuted} />
        <Text style={styles.linkText}>LinkedIn</Text>
      </View>
      <View style={styles.linkRow}>
        <Ionicons name="link-outline" size={16} color={colors.textMuted} />
        <Text style={styles.linkText}>GitHub</Text>
      </View>

      <GradientButton title="Edit Profile" color={colors.teal} onPress={() => navigation.navigate('EditProfile')} style={{ marginTop: 24 }} />
      <GradientButton title="CV Upload" color={colors.tealDark} onPress={() => navigation.navigate('CVUpload')} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  avatarWrap: { alignItems: 'center', marginTop: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 12, color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: 20, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  linkText: { marginLeft: 8, color: colors.textMuted },
});
