import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../theme/colors';

const STATUS_STYLES = {
  'Under review': { bg: colors.purpleBg, fg: '#5A54E0' },
  Interview: { bg: colors.redBg, fg: '#D9635C' },
  Applied: { bg: '#E7E7E7', fg: colors.textMuted },
  Accepted: { bg: colors.greenBg, fg: '#0F8A5F' },
};

const MOCK_APPLICATIONS = [
  { id: '1', title: 'AI Engineer Intern', status: 'Under review' },
  { id: '2', title: 'Data Analyst Intern', status: 'Interview' },
  { id: '3', title: 'Backend Intern', status: 'Applied' },
  { id: '4', title: 'Product Intern', status: 'Accepted' },
];

function StatusPill({ status }) {
  const palette = STATUS_STYLES[status] ?? STATUS_STYLES.Applied;
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{status}</Text>
    </View>
  );
}

export default function ApplicationsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Applications</Text>

      {MOCK_APPLICATIONS.map((app, index) => (
        <View key={app.id} style={[styles.row, index === MOCK_APPLICATIONS.length - 1 && { borderBottomWidth: 0 }]}>
          <Text style={styles.rowTitle}>{app.title}</Text>
          <StatusPill status={app.status} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontWeight: '600', color: colors.textDark },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '700' },
});
