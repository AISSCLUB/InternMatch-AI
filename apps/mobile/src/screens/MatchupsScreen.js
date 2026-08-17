import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import PressableCard from '../components/PressableCard';
import PressableScale from '../components/PressableScale';
import MatchBadge from '../components/MatchBadge';
import GradientButton from '../components/GradientButton';
import { getMatches } from '../services/api';
import { useProfile } from '../context/ProfileContext';
import { useMatchCalculation } from '../hooks/useMatchCalculation';

export default function MatchupsScreen({ navigation }) {
  const { profile } = useProfile();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    isCalculating,
    progressPercent,
    calculationError,
    startCalculation,
    cancelCalculation,
  } = useMatchCalculation();

  const hasAnalyzedCV = Boolean(
    profile?.cv_url ||
      (profile?.skills && profile.skills.length > 0) ||
      (profile?.education && profile.education.length > 0) ||
      (profile?.experience && profile.experience.length > 0) ||
      (profile?.projects && profile.projects.length > 0)
  );

  const fetchMatchesData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getMatches();
      setMatches(res.matches || []);
    } catch (err) {
      console.warn('Failed to load matchups:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load matchups.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchesData();
  }, [fetchMatchesData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMatchesData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecalculate = () => {
    startCalculation(() => {
      fetchMatchesData();
    });
  };

  const [top, ...rest] = matches;

  const renderRecalculateAction = () => {
    if (!hasAnalyzedCV || matches.length === 0 || isCalculating) return null;
    return (
      <PressableScale
        style={styles.recalculateHeaderBtn}
        onPress={handleRecalculate}
        disabled={isCalculating}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Recalculate matches"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="refresh"
          size={14}
          color={colors.accentStrong || colors.tealDark}
          style={styles.recalcIcon}
        />
        <Text style={styles.recalculateHeaderText}>Recalculate</Text>
      </PressableScale>
    );
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title="Matchups"
        alignment="start"
        rightAction={renderRecalculateAction()}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent || colors.teal]}
            tintColor={colors.accent || colors.teal}
          />
        }
      >
        {/* Calculating Status Banner */}
        {isCalculating && (
          <Card style={styles.calculatingCard} padding="md">
            <ActivityIndicator size="small" color={colors.accent || colors.teal} />
            <Text style={styles.calculatingTitle}>Recalculating Matchups...</Text>
            <Text style={styles.calculatingSubtitle}>
              Comparing your profile against all internship listings ({progressPercent}%)
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.cancelCalcBtn}
              onPress={cancelCalculation}
              accessibilityRole="button"
              accessibilityLabel="Stop Checking"
            >
              <Text style={styles.cancelCalcText}>Stop Checking</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Calculation Error */}
        {calculationError && (
          <Card style={styles.errorCard} padding="md">
            <Ionicons name="alert-circle-outline" size={24} color={colors.danger || '#EF4444'} />
            <Text style={styles.errorText}>{calculationError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRecalculate}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Initial Loading */}
        {loading && !refreshing && !isCalculating && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Loading your matchups...</Text>
          </View>
        )}

        {/* API / Network Error */}
        {!loading && error && !isCalculating && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger || '#EF4444'} />
            <Text style={styles.errorTitle}>Could Not Load Matchups</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchMatchesData}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Empty State: No CV Analyzed */}
        {!loading && !error && !isCalculating && !hasAnalyzedCV && (
          <Card style={styles.emptyCard} padding="lg">
            <Ionicons name="document-text-outline" size={48} color={colors.accent || colors.teal} />
            <Text style={styles.emptyTitle}>CV Required for Matchups</Text>
            <Text style={styles.emptySubtitle}>
              Upload and analyze your CV so our AI matching engine can compute compatibility scores for you.
            </Text>
            <GradientButton
              title="Upload CV"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('CVUpload')}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />
          </Card>
        )}

        {/* Empty State: CV Analyzed but No Matches Calculated */}
        {!loading && !error && !isCalculating && hasAnalyzedCV && matches.length === 0 && (
          <Card style={styles.emptyCard} padding="lg">
            <Ionicons name="sparkles-outline" size={48} color={colors.accent || colors.teal} />
            <Text style={styles.emptyTitle}>No Matches Calculated Yet</Text>
            <Text style={styles.emptySubtitle}>
              Ready to find your best matches? Run our matching calculation to score available internships against your verified skills and background.
            </Text>
            <GradientButton
              title="Calculate My Matches"
              color={colors.accent || colors.teal}
              onPress={handleRecalculate}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />
          </Card>
        )}

        {/* Populated Matchups List */}
        {!loading && !error && !isCalculating && top && (
          <>
            {/* Top Highlight Card */}
            <Card variant="highlight" style={styles.highlightCard} padding="md">
              <PressableScale
                onPress={() =>
                  navigation.navigate('InternshipDetail', {
                    internshipId: top.internship.id,
                  })
                }
                scaleTo={0.985}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${top.internship.title} at ${top.internship.company}`}
              >
                <View style={styles.highlightTop}>
                  <Ionicons name="flame" size={16} color="#F2812B" style={styles.flameIcon} />
                  <Text style={styles.highlightLabel}>Highest Compatibility</Text>
                </View>

                <View style={styles.highlightTitleRow}>
                  <Text style={styles.highlightTitle}>{top.internship.title}</Text>
                  <MatchBadge score={top.overall_score} />
                </View>

                <Text style={styles.highlightMeta}>
                  {top.internship.company} · {top.internship.location}
                </Text>

                <View style={styles.scoresSubRow}>
                  <Text style={styles.scoresSubText}>
                    Skills: {top.skill_score}% · Vector: {top.vector_score}%
                  </Text>
                </View>
              </PressableScale>

              <PressableScale
                style={styles.whyLinkWrap}
                onPress={() =>
                  navigation.navigate('WhyYouMatch', {
                    matchId: top.match_id,
                    internshipId: top.internship.id,
                  })
                }
                scaleTo={0.98}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Why You Match breakdown"
              >
                <Text style={styles.whyLink}>Why You Match</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.primaryBlue}
                  style={styles.chevronIcon}
                />
              </PressableScale>
            </Card>

            {/* Remaining Matches */}
            {rest.map((item, index) => (
              <Card
                key={item.match_id}
                style={[
                  styles.plainRowCard,
                  index === rest.length - 1 && { marginBottom: spacing.md },
                ]}
                padding="sm"
              >
                <PressableScale
                  style={styles.plainRow}
                  onPress={() =>
                    navigation.navigate('InternshipDetail', {
                      internshipId: item.internship.id,
                    })
                  }
                  scaleTo={0.985}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.internship.title} at ${item.internship.company}`}
                >
                  <View style={styles.plainRowMain}>
                    <Text style={styles.plainTitle}>{item.internship.title}</Text>
                    <Text style={styles.plainMeta}>
                      {item.internship.company} · {item.internship.location}
                    </Text>
                    <PressableScale
                      style={styles.plainWhyWrap}
                      onPress={() =>
                        navigation.navigate('WhyYouMatch', {
                          matchId: item.match_id,
                          internshipId: item.internship.id,
                        })
                      }
                      scaleTo={0.98}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Why You Match breakdown for ${item.internship.title}`}
                    >
                      <Text style={styles.plainWhyLink}>Why You Match</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={colors.primaryBlue}
                        style={styles.chevronIcon}
                      />
                    </PressableScale>
                  </View>
                  <MatchBadge score={item.overall_score} />
                </PressableScale>
              </Card>
            ))}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  recalculateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft || '#E6F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    minHeight: 34,
  },
  recalcIcon: {
    marginEnd: spacing.xs,
  },
  recalculateHeaderText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.md,
  },
  calculatingCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calculatingTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.sm,
  },
  calculatingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
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
  cancelCalcBtn: {
    marginTop: spacing.md,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  cancelCalcText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textDecorationLine: 'underline',
  },
  errorCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.danger || '#EF4444',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: spacing.xs,
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
  emptyCard: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  highlightCard: {
    marginBottom: spacing.md,
  },
  highlightTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIcon: {
    marginEnd: spacing.xs,
  },
  highlightLabel: {
    ...typography.eyebrow,
    color: '#D97706',
  },
  highlightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  highlightTitle: {
    flex: 1,
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginEnd: spacing.sm,
  },
  highlightMeta: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
  },
  scoresSubRow: {
    marginTop: spacing.sm,
  },
  scoresSubText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    fontWeight: '500',
  },
  whyLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
    minHeight: spacing.minimumTouchTarget,
  },
  whyLink: {
    ...typography.bodyEmphasis,
    color: colors.info || colors.primaryBlue,
    fontSize: 13,
  },
  chevronIcon: {
    marginStart: spacing.xxs,
  },
  plainRowCard: {
    marginBottom: spacing.sm,
  },
  plainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xs,
    minHeight: spacing.minimumTouchTarget,
  },
  plainRowMain: {
    flex: 1,
    marginEnd: spacing.md,
  },
  plainTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.textPrimary || colors.textDark,
  },
  plainMeta: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
  },
  plainWhyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 28,
  },
  plainWhyLink: {
    ...typography.caption,
    color: colors.info || colors.primaryBlue,
    fontWeight: '600',
  },
});
