import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import motionTokens from '../motion/motionTokens';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Chip from '../components/Chip';
import AnimatedScoreRing from '../components/motion/AnimatedScoreRing';
import Reveal from '../components/motion/Reveal';
import { getMatchExplanation, ApiError } from '../services/api';

export default function WhyYouMatchScreen({ route, navigation }) {
  const matchId = route?.params?.matchId;
  const internshipId = route?.params?.internshipId;

  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const fetchExplanationData = useCallback(async () => {
    if (!matchId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await getMatchExplanation(matchId);
      setExplanation(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Match explanation service is busy. Please try again in a moment.');
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to generate match explanation.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchExplanationData();
  }, [fetchExplanationData]);

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Why You Match"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Generating AI Match Breakdown...</Text>
            <Text style={styles.loadingSubtext}>
              Analyzing requirements against your verified background
            </Text>
          </View>
        )}

        {/* 404 Not Found State */}
        {!loading && isNotFound && (
          <Card style={styles.statusCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary || colors.textMuted} />
            <Text style={styles.cardTitle}>Match Record Not Found</Text>
            <Text style={styles.cardSubtitle}>
              This match explanation could not be found. Please recalculate matches from the Matchups tab.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back to Matchups"
            >
              <Text style={styles.primaryButtonText}>Back to Matchups</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger || '#EF4444'} />
            <Text style={styles.cardTitle}>Could Not Load Explanation</Text>
            <Text style={styles.cardSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={fetchExplanationData}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Populated Match Breakdown with Staggered Editorial Reveal */}
        {!loading && !isNotFound && !error && explanation && (
          <>
            {/* Sequence 1: Animated Compatibility Score Hero */}
            <Reveal delay={0}>
              <View style={styles.ringWrap}>
                <AnimatedScoreRing score={explanation.overall_score} />
                <Text style={styles.scoreLabel}>Overall Compatibility Fit</Text>
              </View>
            </Reveal>

            {/* Sequence 2: AI Narrative Fit Assessment */}
            {explanation.why_you_match ? (
              <Reveal delay={motionTokens.stagger.fast}>
                <Card style={styles.narrativeCard} padding="md">
                  <View style={styles.narrativeHeader}>
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color={colors.accentStrong || colors.tealDark}
                      style={styles.headerIcon}
                    />
                    <Text style={styles.narrativeTitle}>AI Fit Assessment</Text>
                  </View>
                  <Text style={styles.narrativeBody}>{explanation.why_you_match}</Text>
                </Card>
              </Reveal>
            ) : null}

            {/* Sequence 3: Competencies & Skill Gaps */}
            <Reveal delay={motionTokens.stagger.normal}>
              {/* Matching Competencies */}
              <Text style={styles.sectionTitle}>Matching Competencies</Text>
              {explanation.matching_skills && explanation.matching_skills.length > 0 ? (
                <View style={styles.chipRow}>
                  {explanation.matching_skills.map((skill) => (
                    <Chip key={skill} label={skill} variant="skill" />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptySkillsNotice}>No direct skill overlaps identified.</Text>
              )}

              {/* Identified Skill Gaps */}
              <Text style={styles.sectionTitle}>Identified Skill Gaps</Text>
              {explanation.missing_skills && explanation.missing_skills.length > 0 ? (
                <View style={styles.chipRow}>
                  {explanation.missing_skills.map((skill) => (
                    <Chip key={skill} label={skill} variant="gap" />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptySkillsNotice}>No major skill gaps identified for this role.</Text>
              )}

              {/* Skill Gap Analysis & Recommendations */}
              {explanation.skill_gap_analysis ? (
                <View style={styles.recommendationsBox}>
                  <View style={styles.recHeaderRow}>
                    <Ionicons
                      name="bulb-outline"
                      size={18}
                      color="#B45309"
                      style={styles.headerIcon}
                    />
                    <Text style={styles.recBoxTitle}>Skill Gap Analysis & Recommendations</Text>
                  </View>

                  {explanation.skill_gap_analysis.summary ? (
                    <Text style={styles.recSummaryText}>
                      {explanation.skill_gap_analysis.summary}
                    </Text>
                  ) : null}

                  {explanation.skill_gap_analysis.recommendations &&
                  explanation.skill_gap_analysis.recommendations.length > 0 ? (
                    <View style={styles.recommendationsList}>
                      {explanation.skill_gap_analysis.recommendations.map((rec, idx) => (
                        <View key={idx} style={styles.recItemRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.accent || colors.teal}
                            style={styles.recIcon}
                          />
                          <Text style={styles.recItemText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Reveal>

            {/* Sequence 4: Personalized Cover Letter Generation CTA */}
            <Reveal delay={motionTokens.stagger.slow}>
              <Card variant="highlight" style={styles.generateCtaCard} padding="lg">
                <View style={styles.generateCtaHeader}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={colors.accent || colors.teal}
                    style={styles.headerIcon}
                  />
                  <Text style={styles.generateCtaTitle}>Personalized Application</Text>
                </View>
                <Text style={styles.generateCtaSubtitle}>
                  Generate a tailored, grounded cover letter crafted from your verified profile and this match breakdown.
                </Text>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() =>
                    navigation.navigate('CoverLetterDraft', {
                      matchId,
                      internshipId,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Generate Cover Letter"
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={colors.textInverse || colors.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.generateButtonText}>Generate Cover Letter</Text>
                </TouchableOpacity>
              </Card>
            </Reveal>
          </>
        )}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  loadingText: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statusCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  errorCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 14,
  },
  ringWrap: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  narrativeCard: {
    marginBottom: spacing.lg,
  },
  narrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerIcon: {
    marginEnd: spacing.xs,
  },
  narrativeTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    color: colors.textPrimary || colors.textDark,
  },
  narrativeBody: {
    ...typography.body,
    color: colors.textSecondary || colors.textDark,
    lineHeight: 22,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  emptySkillsNotice: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  recommendationsBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: spacing.radii.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recBoxTitle: {
    ...typography.bodyEmphasis,
    color: '#92400E',
    fontSize: 13,
  },
  recSummaryText: {
    ...typography.caption,
    color: '#78350F',
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  recommendationsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  recItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recIcon: {
    marginEnd: spacing.xs,
    marginTop: 2,
  },
  recItemText: {
    flex: 1,
    ...typography.caption,
    color: '#78350F',
    lineHeight: 18,
  },
  generateCtaCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  generateCtaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  generateCtaTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
  },
  generateCtaSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
    lineHeight: 18,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent || colors.teal,
    paddingVertical: spacing.md,
    borderRadius: spacing.radii.md,
    marginTop: spacing.lg,
    minHeight: spacing.minimumTouchTarget,
  },
  generateButtonText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 14,
  },
  buttonIcon: {
    marginEnd: spacing.xs,
  },
});
