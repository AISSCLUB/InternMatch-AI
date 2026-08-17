import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { useApplicationGeneration } from '../hooks/useApplicationGeneration';
import { getApplications } from '../services/api';

const TONE_PRESETS = ['Professional', 'Concise', 'Enthusiastic'];
const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
];

export default function CoverLetterDraftScreen({ route, navigation }) {
  const matchId = route?.params?.matchId;
  const internshipId = route?.params?.internshipId;

  const [tone, setTone] = useState('Professional');
  const [contentLocale, setContentLocale] = useState('en');
  const [application, setApplication] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [resolveError, setResolveError] = useState(null);

  const {
    isGenerating,
    progressPercent,
    generationError,
    startGeneration,
    cancelGeneration,
  } = useApplicationGeneration();

  // Check if an application with generated cover letter already exists for this internship
  const checkExistingApplication = useCallback(async () => {
    if (!internshipId) {
      setLoadingExisting(false);
      return;
    }

    try {
      const res = await getApplications();
      const existing = res.applications.find(
        (app) => app.internship_id === internshipId && Boolean(app.generated_cover_letter)
      );
      if (existing) {
        setApplication(existing);
      }
    } catch (err) {
      console.warn('Failed to check existing application:', err);
    } finally {
      setLoadingExisting(false);
    }
  }, [internshipId]);

  useEffect(() => {
    checkExistingApplication();
  }, [checkExistingApplication]);

  const handleGenerate = () => {
    if (!matchId) {
      setResolveError('Match identifier is missing. Please return to Matchups.');
      return;
    }

    setResolveError(null);

    const selectedTone = tone.trim() || 'Professional';

    startGeneration(
      {
        match_id: matchId,
        tone: selectedTone,
        content_locale: contentLocale,
      },
      async (jobResult) => {
        try {
          const listRes = await getApplications();
          let resolvedApp = null;

          if (jobResult && jobResult.application_id) {
            resolvedApp = listRes.applications.find(
              (a) => a.id === jobResult.application_id
            );
          }

          if (!resolvedApp && internshipId) {
            resolvedApp = listRes.applications.find(
              (a) => a.internship_id === internshipId
            );
          }

          if (resolvedApp) {
            setApplication(resolvedApp);
          } else {
            setResolveError('Cover letter generated, but could not load the application record. Please check Application Tracker.');
          }
        } catch (err) {
          console.warn('Failed to refresh applications after generation:', err);
          const msg = err instanceof Error ? err.message : 'Failed to retrieve generated cover letter.';
          setResolveError(msg);
        }
      }
    );
  };

  const handleProceedToEdit = () => {
    if (!application) return;

    navigation.navigate('CoverLetter', {
      applicationId: application.id,
      draft: application.generated_cover_letter || '',
      currentStatus: application.status,
      internshipId: application.internship_id || internshipId,
      companyName: application.company_name,
      jobTitle: application.job_title,
    });
  };

  if (!matchId && !internshipId) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorScreenTitle}>Missing Match Reference</Text>
        <Text style={styles.errorScreenSubtitle}>
          Please select a match from the Matchups tab to generate a cover letter.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>AI Cover Letter</Text>
      <Text style={styles.subtitle}>
        Grounded application letter tailored to the job requirements and your verified profile.
      </Text>

      {/* Loading Existing Draft Check */}
      {loadingExisting && (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={colors.teal} />
          <Text style={styles.loadingText}>Checking existing drafts...</Text>
        </View>
      )}

      {/* Configuration Section (Tone & Locale) */}
      {!loadingExisting && !isGenerating && (
        <View style={styles.configCard}>
          <Text style={styles.sectionHeader}>GENERATION SETTINGS</Text>

          {/* Tone Selector */}
          <Text style={styles.fieldLabel}>Tone of Voice</Text>
          <View style={styles.presetRow}>
            {TONE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  tone === preset && styles.presetChipActive,
                ]}
                onPress={() => setTone(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    tone === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.customToneInput}
            value={tone}
            onChangeText={setTone}
            placeholder="Or customize tone (e.g. Confident & Analytical)"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
          />

          {/* Locale Selector */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Language</Text>
          <View style={styles.presetRow}>
            {LOCALES.map((loc) => (
              <TouchableOpacity
                key={loc.code}
                style={[
                  styles.presetChip,
                  contentLocale === loc.code && styles.presetChipActive,
                ]}
                onPress={() => setContentLocale(loc.code)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    contentLocale === loc.code && styles.presetChipTextActive,
                  ]}
                >
                  {loc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* In-Progress Generating State */}
      {isGenerating && (
        <View style={styles.generatingCard}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.generatingTitle}>Generating Cover Letter...</Text>
          <Text style={styles.generatingSubtitle}>
            Gemini is grounding your skills and experience against the internship description ({progressPercent}%)
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.percentText}>{progressPercent}%</Text>

          <TouchableOpacity style={styles.cancelBtn} onPress={cancelGeneration}>
            <Text style={styles.cancelBtnText}>Stop Checking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Generation Error State */}
      {generationError && !isGenerating && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.red || '#EF4444'} />
          <Text style={styles.errorCardTitle}>Generation Could Not Complete</Text>
          <Text style={styles.errorCardMessage}>{generationError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleGenerate}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resolution Error */}
      {resolveError && !isGenerating && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.orange || '#F59E0B'} />
          <Text style={styles.errorCardTitle}>Application Tracker Sync</Text>
          <Text style={styles.errorCardMessage}>{resolveError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={checkExistingApplication}>
            <Text style={styles.retryBtnText}>Refresh Applications</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Display Generated Cover Letter */}
      {!loadingExisting && !isGenerating && application && application.generated_cover_letter ? (
        <View style={styles.resultSection}>
          <View style={styles.resultHeaderRow}>
            <Text style={styles.resultLabel}>GENERATED DRAFT</Text>
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.teal} style={{ marginRight: 4 }} />
              <Text style={styles.savedBadgeText}>Saved in Tracker</Text>
            </View>
          </View>

          <View style={styles.draftBox}>
            <Text style={styles.draftText}>{application.generated_cover_letter}</Text>
          </View>

          <GradientButton
            title="Review & Edit"
            color={colors.tealDark}
            onPress={handleProceedToEdit}
            style={{ marginTop: 20 }}
          />

          <TouchableOpacity style={styles.recreateBtn} onPress={handleGenerate}>
            <Ionicons name="refresh-outline" size={16} color={colors.tealDark} style={{ marginRight: 6 }} />
            <Text style={styles.recreateBtnText}>Regenerate with New Options</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Initial Generate Action (When no draft exists yet) */}
      {!loadingExisting && !isGenerating && (!application || !application.generated_cover_letter) ? (
        <GradientButton
          title="Generate Cover Letter"
          color={colors.teal}
          onPress={handleGenerate}
          style={{ marginTop: 24 }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  centerScreen: { flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorScreenTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginTop: 14 },
  errorScreenSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  primaryBtn: { marginTop: 20, backgroundColor: colors.teal, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  centerLoading: { alignItems: 'center', paddingVertical: 24 },
  loadingText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  configCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  presetChipText: { fontSize: 13, color: colors.textDark, fontWeight: '500' },
  presetChipTextActive: { color: colors.white, fontWeight: '700' },
  customToneInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    fontSize: 13,
    color: colors.textDark,
    backgroundColor: colors.white,
  },
  generatingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  generatingTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  generatingSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 6, backgroundColor: colors.teal },
  percentText: { fontSize: 12, fontWeight: '600', color: colors.teal, alignSelf: 'flex-end', marginTop: 4 },
  cancelBtn: { marginTop: 14, paddingVertical: 6 },
  cancelBtnText: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginVertical: 12,
  },
  errorCardTitle: { fontSize: 15, fontWeight: '700', color: colors.red || '#EF4444', marginTop: 8 },
  errorCardMessage: { fontSize: 13, color: colors.red || '#EF4444', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  retryBtn: { marginTop: 12, backgroundColor: colors.teal, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  resultSection: { marginTop: 8 },
  resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  savedBadgeText: { fontSize: 11, fontWeight: '600', color: colors.tealDark },
  draftBox: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 14,
    padding: 16,
    minHeight: 180,
  },
  draftText: { fontSize: 14, color: colors.textDark, lineHeight: 22 },
  recreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: '#E6F4F6',
    borderRadius: 10,
  },
  recreateBtnText: { fontSize: 13, color: colors.tealDark, fontWeight: '600' },
});
