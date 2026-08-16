import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import * as DocumentPicker from 'expo-document-picker';

const EXTRACTED_SKILLS = ['Python', 'ML', 'SQL'];

export default function CVUploadScreen({ route, navigation }) {
  const [fileName, setFileName] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const analysisIntervalRef = useRef(null);
  const progressRef = useRef(0);

  const clearAnalysisInterval = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAnalysisInterval();
    };
  }, []);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const res = result.assets[0];
      setFileName(res.name);
      startAnalysis();
    } catch (err) {
      console.warn(err);
    }
  };

  const completeAnalysis = () => {
    clearAnalysisInterval();

    progressRef.current = 1;
    setProgress(1);
    setAnalyzing(false);

    if (route?.params?.origin === 'Home') {
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: {
          cvAnalyzed: true,
        },
      });

      return;
    }

    navigation.goBack();
  };

  const startAnalysis = () => {
    clearAnalysisInterval();

    progressRef.current = 0;
    setProgress(0);
    setAnalyzing(true);

    analysisIntervalRef.current = setInterval(() => {
      const next = Math.min(progressRef.current + 0.1, 1);

      progressRef.current = next;
      setProgress(next);

      if (next >= 1) {
        completeAnalysis();
      }
    }, 300);
  };

  const stopAnalysis = () => {
    clearAnalysisInterval();

    progressRef.current = 0;
    setAnalyzing(false);
    setProgress(0);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>CV Upload</Text>

      {!analyzing ? (
        <TouchableOpacity style={styles.dropZone} onPress={pickFile}>
          <Ionicons name="arrow-up" size={22} color={colors.textMuted} />
          <Text style={styles.dropText}>{fileName ?? 'Upload a PDF or select'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.dropZoneCompact}>
          <Ionicons name="document-text-outline" size={22} color={colors.teal} />
        </View>
      )}

      {analyzing && (
        <>
          <Text style={styles.analyzingTitle}>AI is analyzing</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.analyzingSubtitle}>Skills and experience are being extracted...</Text>

          <View style={styles.chipRow}>
            {EXTRACTED_SKILLS.map((s, i) => (
              <View key={s} style={{ opacity: progress > i * 0.3 ? 1 : 0.3 }}>
                <Chip label={`${s} ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ`} variant="skill" />
              </View>
            ))}
          </View>

          <GradientButton title="Stop analysis" color={colors.tealDark} onPress={stopAnalysis} style={{ marginTop: 24 }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg, padding: 20 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 24 },
  dropZone: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneCompact: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: { marginTop: 8, color: colors.textMuted, fontSize: 13 },
  analyzingTitle: { fontWeight: '700', color: colors.textDark, marginTop: 24 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#DCEBEE', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.tealDark },
  analyzingSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
});

