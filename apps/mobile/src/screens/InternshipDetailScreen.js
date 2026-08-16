import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import MatchBadge from '../components/MatchBadge';
import GradientButton from '../components/GradientButton';

// Fallback used if the screen is opened without navigation params
const DEFAULT_INTERNSHIP = {
  title: 'AI Engineer Intern',
  company: 'Nova Labs',
  location: 'Ä°stanbul',
  score: 94,
  description: '3-month, full-time internship. Development of machine learning models and support for data pipeline processes.',
  skills: [
    { label: 'Python', variant: 'skill' },
    { label: 'ML', variant: 'skill' },
    { label: 'Docker', variant: 'gap' },
  ],
};

export default function InternshipDetailScreen({ route, navigation }) {
  const internship = route?.params?.internship ?? DEFAULT_INTERNSHIP;
  const data = { ...DEFAULT_INTERNSHIP, ...internship };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.meta}>
        {data.company} Â· {data.location}
      </Text>
      <Text style={styles.title}>{data.title}</Text>
      <MatchBadge score={data.score} style={{ alignSelf: 'flex-start', marginTop: 8 }} />

      <Text style={styles.description}>{data.description}</Text>

      <Text style={styles.sectionTitle}>Required Competencies</Text>
      <View style={styles.chipRow}>
        {data.skills.map((s) => (
          <Chip key={s.label} label={s.label} variant={s.variant} />
        ))}
      </View>

      <GradientButton
        title="Why You Match"
        color={colors.tealDark}
        onPress={() => navigation.navigate('WhyYouMatch', { internship: data })}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  meta: { fontSize: 13, color: colors.textMuted },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginTop: 4 },
  description: { fontSize: 14, color: colors.textDark, marginTop: 18, lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: 24, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
