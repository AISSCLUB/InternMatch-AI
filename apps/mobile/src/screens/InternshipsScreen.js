import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import MatchBadge from '../components/MatchBadge';

const FILTERS = ['All', 'Software', 'Data'];

const MOCK_INTERNSHIPS = [
  { id: '1', title: 'AI Engineer Intern', company: 'Nova Labs', location: 'Ä°stanbul', score: 94, category: 'Software' },
  { id: '2', title: 'Data Analyst Intern', company: 'Fintra', location: 'Remote', score: 88, category: 'Data' },
  { id: '3', title: 'Backend Intern', company: 'LoopWise', location: 'Ankara', score: 71, category: 'Software' },
];

export default function InternshipsScreen({ navigation }) {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? MOCK_INTERNSHIPS : MOCK_INTERNSHIPS.filter((i) => i.category === filter);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Internships</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addChip}>
          <Ionicons name="add" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {filtered.map((item) => (
        <TouchableOpacity key={item.id} style={styles.card} onPress={() => navigation.navigate('InternshipDetail', { internship: item })}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <MatchBadge score={item.score} />
          </View>
          <Text style={styles.cardMeta}>
            {item.company} Â· {item.location}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#DCE9EC',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: colors.white },
  addChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCE9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontWeight: '700', fontSize: 15, color: colors.textDark, marginRight: 8 },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
