import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';

export default function CoverLetterScreen({ route, navigation }) {
  const [text, setText] = useState(route?.params?.draft ?? '');

  const handleSubmit = () => {
    // TODO: POST the cover letter + application to your backend
    Alert.alert('Application submitted', 'Your cover letter has been submitted.', [
      { text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Applications' }) },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>Cover Letter</Text>

      <View style={styles.draftBox}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />
      </View>

      <GradientButton title="Submit" color={colors.tealDark} onPress={handleSubmit} style={{ marginTop: 24 }} />
    </KeyboardAvoidingView>
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
    minHeight: 220,
  },
  input: { fontSize: 14, color: colors.textDark, lineHeight: 20, flex: 1 },
});
