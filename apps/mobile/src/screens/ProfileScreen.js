import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';

export default function ProfileScreen({ navigation }) {
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
  const primaryEducation = education.length > 0
    ? `${education[0].institution}${education[0].degree ? ` · ${education[0].degree}` : ''}`
    : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshProfile} tintColor={colors.teal} />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-outline" size={36} color={colors.textMuted} />
        </View>
      </View>

      {loading && !profile ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : profile ? (
        <>
          <Text style={styles.name}>{profile.full_name}</Text>
          {profile.headline ? <Text style={styles.subtitle}>{profile.headline}</Text> : null}
          {primaryEducation ? <Text style={styles.subtitle}>{primaryEducation}</Text> : null}

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
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={16} color={colors.textMuted} />
            <Text style={styles.linkText}>LinkedIn</Text>
          </View>
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={16} color={colors.textMuted} />
            <Text style={styles.linkText}>GitHub</Text>
          </View>

          <GradientButton
            title="Edit Profile"
            color={colors.teal}
            onPress={() => navigation.navigate('EditProfile')}
            style={{ marginTop: 24 }}
          />
          <GradientButton
            title="CV Upload"
            color={colors.tealDark}
            onPress={() => navigation.navigate('CVUpload')}
            style={{ marginTop: 12 }}
          />
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.name}>No Profile Yet</Text>
          <Text style={styles.subtitle}>Create your profile to start matching with internships.</Text>
          <GradientButton
            title="Create Profile"
            color={colors.teal}
            onPress={() => navigation.navigate('EditProfile')}
            style={{ marginTop: 24 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  avatarWrap: { alignItems: 'center', marginTop: 16 },
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
  loadingWrap: { alignItems: 'center', marginTop: 30 },
  loadingText: { marginTop: 10, fontSize: 14, color: colors.textMuted },
  emptyWrap: { alignItems: 'center', marginTop: 16 },
});
