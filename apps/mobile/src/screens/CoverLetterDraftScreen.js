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
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
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
            setResolveError(
              'Cover letter generated, but could not load the application record. Please check Application Tracker.'
            );
          }
        } catch (err) {
          console.warn('Failed to refresh applications after generation:', err);
          const msg =
            err instanceof Error ? err.message : 'Failed to retrieve generated cover letter.';
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
      <ScreenContainer edges={['top', 'bottom']}>
        <ScreenHeader title="AI Cover Letter" showBack={true} navigation={navigation} />
        <Card style={styles.centerScreenCard} padding="lg">
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary || colors.textMuted} />
          <Text style={styles.errorScreenTitle}>Missing Match Reference</Text>
          <Text style={styles.errorScreenSubtitle}>
            Please select a match from the Matchups tab to generate a cover letter.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="AI Cover Letter"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Grounded application letter tailored to the job requirements and your verified profile.
        </Text>

        {/* Loading Existing Draft Check */}
        {loadingExisting && (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Checking existing drafts...</Text>
          </View>
        )}

        {/* Configuration Section (Tone & Locale) */}
        {!loadingExisting && !isGenerating && (
          <Card style={styles.configCard} padding="md">
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
                  accessibilityRole="button"
                  accessibilityLabel={`Tone: ${preset}`}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
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
              placeholderTextColor={colors.textTertiary || colors.textMuted}
              maxLength={60}
            />

            {/* Locale Selector */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Language</Text>
            <View style={styles.presetRow}>
              {LOCALES.map((loc) => (
                <TouchableOpacity
                  key={loc.code}
                  style={[
                    styles.presetChip,
                    contentLocale === loc.code && styles.presetChipActive,
                  ]}
                  onPress={() => setContentLocale(loc.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`Language: ${loc.label}`}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
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
          </Card>
        )}

        {/* In-Progress Generating State */}
        {isGenerating && (
          <Card style={styles.generatingCard} padding="lg">
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.generatingTitle}>Generating Cover Letter...</Text>
            <Text style={styles.generatingSubtitle}>
              Gemini is grounding your skills and experience against the internship description ({progressPercent}%)
            </Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.percentText}>{progressPercent}%</Text>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={cancelGeneration}
              accessibilityRole="button"
              accessibilityLabel="Stop Checking"
            >
              <Text style={styles.cancelBtnText}>Stop Checking</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Generation Error State */}
        {generationError && !isGenerating && (
          <Card style={styles.errorCard} padding="md">
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger || '#EF4444'} />
            <Text style={styles.errorCardTitle}>Generation Could Not Complete</Text>
            <Text style={styles.errorCardMessage}>{generationError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleGenerate}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Resolution Error */}
        {resolveError && !isGenerating && (
          <Card style={styles.errorCard} padding="md">
            <Ionicons name="alert-circle-outline" size={28} color={colors.warning || '#F59E0B'} />
            <Text style={styles.errorCardTitle}>Application Tracker Sync</Text>
            <Text style={styles.errorCardMessage}>{resolveError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={checkExistingApplication}
              accessibilityRole="button"
              accessibilityLabel="Refresh Applications"
            >
              <Text style={styles.retryBtnText}>Refresh Applications</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Display Generated Cover Letter */}
        {!loadingExisting && !isGenerating && application && application.generated_cover_letter ? (
          <View style={styles.resultSection}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultLabel}>GENERATED DRAFT</Text>
              <View style={styles.savedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={colors.accent || colors.teal}
                  style={styles.savedIcon}
                />
                <Text style={styles.savedBadgeText}>Saved in Tracker</Text>
              </View>
            </View>

            <Card style={styles.draftCard} padding="md">
              <Text style={styles.draftText}>{application.generated_cover_letter}</Text>
            </Card>

            <GradientButton
              title="Review & Edit"
              color={colors.accentStrong || colors.tealDark}
              onPress={handleProceedToEdit}
              style={{ marginTop: spacing.lg }}
            />

            <TouchableOpacity
              style={styles.recreateBtn}
              onPress={handleGenerate}
              accessibilityRole="button"
              accessibilityLabel="Regenerate with New Options"
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={colors.accentStrong || colors.tealDark}
                style={styles.recreateIcon}
              />
              <Text style={styles.recreateBtnText}>Regenerate with New Options</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Initial Generate Action (When no draft exists yet) */}
        {!loadingExisting && !isGenerating && (!application || !application.generated_cover_letter) ? (
          <GradientButton
            title="Generate Cover Letter"
            color={colors.accent || colors.teal}
            onPress={handleGenerate}
            style={{ marginTop: spacing.xl }}
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  centerScreenCard: {
    alignItems: 'center',
    margin: spacing.xl,
  },
  errorScreenTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  errorScreenSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 14,
  },
  centerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.sm,
  },
  configCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typography.eyebrow,
    color: colors.textSecondary || colors.textMuted,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.sm,
    fontSize: 13,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.pill,
    backgroundColor: colors.surfaceSubtle || colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: colors.accent || colors.teal,
    borderColor: colors.accent || colors.teal,
  },
  presetChipText: {
    ...typography.caption,
    color: colors.textPrimary || colors.textDark,
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: colors.textInverse || colors.white,
    fontWeight: '700',
  },
  customToneInput: {
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    borderRadius: spacing.radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary || colors.textDark,
    backgroundColor: colors.surface || colors.white,
    minHeight: 40,
  },
  generatingCard: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  generatingTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  generatingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderSubtle || '#E2E8F0',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accent || colors.teal,
  },
  percentText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent || colors.teal,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    marginTop: spacing.md,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textDecorationLine: 'underline',
  },
  errorCard: {
    alignItems: 'center',
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
    marginVertical: spacing.md,
  },
  errorCardTitle: {
    ...typography.cardTitle,
    color: colors.danger || '#EF4444',
    marginTop: spacing.sm,
  },
  errorCardMessage: {
    ...typography.caption,
    color: colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 13,
  },
  resultSection: {
    marginTop: spacing.xs,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary || colors.textMuted,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft || '#E6F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: spacing.radii.sm,
  },
  savedBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
    fontSize: 11,
  },
  savedIcon: {
    marginEnd: spacing.xxs + 1,
  },
  draftCard: {
    minHeight: 180,
    borderColor: colors.accent || colors.teal,
    borderWidth: 1.5,
  },
  draftText: {
    ...typography.body,
    color: colors.textPrimary || colors.textDark,
    lineHeight: 22,
  },
  recreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderRadius: spacing.radii.md,
    minHeight: spacing.minimumTouchTarget,
  },
  recreateBtnText: {
    ...typography.button,
    color: colors.accentStrong || colors.tealDark,
    fontSize: 13,
  },
  recreateIcon: {
    marginEnd: spacing.xs,
  },
});
