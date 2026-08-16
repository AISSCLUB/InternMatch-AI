import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';

const MOCK_DRAFT =
  '"I believe I will make a strong contribution to the AI Engineer Intern position at Nova Labs with the experience gained from my Python and machine learning projects. In my university project work..."';

export default function CoverLetterDraftScreen({ navigation }) {
  const [draft] = useState(MOCK_DRAFT);

  const handleRecreate = () => {
    // TODO: call AI generation endpoint again for a new draft
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>AI Cover Letter Draft</Text>

      <View style={styles.draftBox}>
        <Text style={styles.draftText}>{draft}</Text>
      </View>

      <GradientButton title="Recreate" color={colors.teal} onPress={handleRecreate} style={{ marginTop: 24 }} />
      <GradientButton
        title="Edit and Submit"
        color={colors.tealDark}
        onPress={() => navigation.navigate('CoverLetter', { draft })}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg, padding: 20 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 20 },
  draftBox: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 14,
    padding: 16,
    minHeight: 160,
  },
  draftText: { fontSize: 14, color: colors.textDark, lineHeight: 20 },
});
