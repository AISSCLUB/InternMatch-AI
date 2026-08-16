import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';
import MatchBadge from '../components/MatchBadge';
import { useProfile } from '../context/ProfileContext';

const MOCK_MATCHUPS = [
  { id: '1', title: 'AI Engineer Intern', company: 'Nova Labs', location: 'İstanbul', score: 94, highlight: true },
  { id: '2', title: 'Data Analyst Intern', score: 88 },
  { id: '3', title: 'Backend Intern', score: 71 },
];

export default function HomeScreen({ navigation }) {
  const { profile } = useProfile();
  const displayName = profile?.full_name?.trim() || 'Student';

  // Derived from real backend profile state
  const hasAnalyzedCV = Boolean(
    profile?.cv_url ||
      (profile?.skills && profile.skills.length > 0) ||
      (profile?.education && profile.education.length > 0) ||
      (profile?.experience && profile.experience.length > 0) ||
      (profile?.projects && profile.projects.length > 0)
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>InternMatch</Text>
        <Ionicons name="locate" size={20} color={colors.teal} style={{ marginLeft: 4 }} />
      </View>
      <Text style={styles.hello}>Hello, {displayName} 👋</Text>

      {!hasAnalyzedCV ? (
        <>
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="arrow-up" size={22} color={colors.teal} />
            </View>
            <Text style={styles.uploadTitle}>Upload your CV and let the matches begin.</Text>
            <Text style={styles.uploadSubtitle}>Drag and drop or select a PDF — AI analyzes it in 30 seconds.</Text>
            <GradientButton
              title="Upload CV"
              color={colors.teal}
              onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
              style={{ marginTop: 16 }}
            />
          </View>

          <Text style={styles.sectionTitle}>Recommendations for You</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>You can browse even without a CV.</Text>
            <Text style={styles.infoSubtitle}>Discover popular internships, see your fit score when you upload your CV.</Text>
          </View>

          <TouchableOpacity style={styles.lockedRow} disabled>
            <Ionicons name="lock-closed" size={16} color={colors.orange} />
            <Text style={styles.lockedTitle}>AI Engineer Intern</Text>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>CV required</Text>
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>CV STATUS</Text>
            <Text style={styles.statusTitle}>Your profile has been analyzed.</Text>
            <View style={styles.statusFileRow}>
              <Text style={styles.statusFileName}>CV Document</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>TODAY'S MATCHUPS</Text>
          {MOCK_MATCHUPS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[item.highlight ? styles.highlightCard : styles.plainRow, index === MOCK_MATCHUPS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('InternshipDetail', { internship: item })}
            >
              {item.highlight ? (
                <>
                  <View style={styles.highlightTop}>
                    <Ionicons name="flame" size={16} color="#F2812B" />
                    <Text style={styles.highlightTitle}>{item.title}</Text>
                    <MatchBadge score={item.score} />
                  </View>
                  <Text style={styles.highlightMeta}>
                    {item.company} · {item.location}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.plainTitle}>{item.title}</Text>
                  <MatchBadge score={item.score} />
                </>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '700', fontStyle: 'italic', color: colors.teal },
  hello: { fontSize: 16, color: colors.teal, fontWeight: '600', marginTop: 4, marginBottom: 16 },

  uploadCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  uploadTitle: { fontWeight: '700', fontSize: 15, textAlign: 'center', color: colors.textDark },
  uploadSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: 22, marginBottom: 10 },

  infoCard: { backgroundColor: colors.cardBg, borderRadius: 14, padding: 16 },
  infoTitle: { fontWeight: '700', fontSize: 14, color: colors.textDark },
  infoSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  lockedTitle: { marginLeft: 6, fontWeight: '600', color: colors.orange, flex: 1 },
  lockedBadge: { backgroundColor: '#EDEDED', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  lockedBadgeText: { fontSize: 11, color: colors.textMuted },

  statusCard: { backgroundColor: '#D9F0F4', borderRadius: 16, padding: 16 },
  statusLabel: { fontSize: 11, fontWeight: '700', color: colors.teal, letterSpacing: 0.5 },
  statusTitle: { fontWeight: '700', fontSize: 15, color: colors.textDark, marginTop: 4 },
  statusFileRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusFileName: { fontSize: 12, color: colors.textMuted },
  reloadLink: { fontSize: 12, color: colors.primaryBlue, fontWeight: '600' },

  highlightCard: { backgroundColor: colors.cardBg, borderRadius: 14, padding: 14, marginBottom: 10 },
  highlightTop: { flexDirection: 'row', alignItems: 'center' },
  highlightTitle: { flex: 1, marginLeft: 6, fontWeight: '700', fontSize: 14, color: colors.textDark },
  highlightMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginLeft: 22 },

  plainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  plainTitle: { fontWeight: '600', color: colors.textDark },
});
