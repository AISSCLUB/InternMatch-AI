import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import MatchBadge from '../components/MatchBadge';

const MOCK_MATCHUPS = [
  { id: '1', title: 'AI Engineer Intern', company: 'Nova Labs', location: 'Ä°stanbul', score: 94, highlight: true },
  { id: '2', title: 'Data Analyst Intern', score: 88 },
  { id: '3', title: 'Backend Intern', score: 71 },
  { id: '4', title: 'Product Intern', score: 63 },
];

export default function MatchupsScreen({ navigation }) {
  const [top, ...rest] = MOCK_MATCHUPS;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Matchups</Text>

      <TouchableOpacity style={styles.highlightCard} onPress={() => navigation.navigate('InternshipDetail', { internship: top })}>
        <View style={styles.highlightTop}>
          <Ionicons name="flame" size={16} color="#F2812B" />
          <Text style={styles.highlightLabel}>Highest Compatibility</Text>
        </View>
        <View style={styles.highlightTitleRow}>
          <Text style={styles.highlightTitle}>{top.title}</Text>
          <MatchBadge score={top.score} />
        </View>
        <Text style={styles.highlightMeta}>
          {top.company} Â· {top.location}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('WhyYouMatch', { internship: top })}>
          <Text style={styles.whyLink}>Why You Match</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {rest.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.plainRow, index === rest.length - 1 && { borderBottomWidth: 0 }]}
          onPress={() => navigation.navigate('InternshipDetail', { internship: item })}
        >
          <Text style={styles.plainTitle}>{item.title}</Text>
          <MatchBadge score={item.score} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  highlightCard: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 10 },
  highlightTop: { flexDirection: 'row', alignItems: 'center' },
  highlightLabel: { marginLeft: 6, color: colors.primaryBlue, fontWeight: '600', textDecorationLine: 'underline', fontSize: 12 },
  highlightTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  highlightTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  highlightMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  whyLink: { color: colors.primaryBlue, fontWeight: '600', fontSize: 12, marginTop: 8, textDecorationLine: 'underline' },
  plainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  plainTitle: { fontWeight: '600', color: colors.textDark },
});
