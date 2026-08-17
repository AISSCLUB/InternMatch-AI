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
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import MatchBadge from '../components/MatchBadge';
import { useProfile } from '../context/ProfileContext';
import { getMatches } from '../services/api';
import { useMatchCalculation } from '../hooks/useMatchCalculation';

export default function HomeScreen({ navigation }) {
  const { profile, refreshProfile } = useProfile();
  const displayName = profile?.full_name?.trim() || 'Student';

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    isCalculating,
    progressPercent,
    calculationError,
    startCalculation,
    cancelCalculation,
  } = useMatchCalculation();

  // Derived from real backend profile state
  const hasAnalyzedCV = Boolean(
    profile?.cv_url ||
      (profile?.skills && profile.skills.length > 0) ||
      (profile?.education && profile.education.length > 0) ||
      (profile?.experience && profile.experience.length > 0) ||
      (profile?.projects && profile.projects.length > 0)
  );

  const fetchMatchesData = useCallback(async () => {
    if (!hasAnalyzedCV) return;

    setMatchesLoading(true);
    setMatchesError(null);

    try {
      const res = await getMatches();
      setMatches(res.matches || []);
    } catch (err) {
      console.warn('Failed to load matches on Home:', err);
      const msg = err instanceof Error ? err.message : 'Unable to load matches.';
      setMatchesError(msg);
    } finally {
      setMatchesLoading(false);
    }
  }, [hasAnalyzedCV]);

  useEffect(() => {
    if (hasAnalyzedCV) {
      fetchMatchesData();
    }
  }, [hasAnalyzedCV, fetchMatchesData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      if (hasAnalyzedCV) {
        await fetchMatchesData();
      }
    } catch (err) {
      console.warn('Home refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartCalculation = () => {
    startCalculation(() => {
      fetchMatchesData();
    });
  };

  const topMatches = matches.slice(0, 3);
  const firstMatch = topMatches[0];
  const remainingMatches = topMatches.slice(1);

  return (
    <ScreenContainer edges={['top']}>
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
        {/* Brand & Greeting Header */}
        <View style={styles.headerBlock}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>InternMatch</Text>
            <Ionicons
              name="locate"
              size={18}
              color={colors.accentStrong || colors.tealDark}
              style={styles.brandIcon}
            />
          </View>
          <Text style={styles.hello} numberOfLines={2}>
            Hello, {displayName} 👋
          </Text>
        </View>

        {!hasAnalyzedCV ? (
          <>
            {/* Upload CV Prompt Card */}
            <Card style={styles.uploadCard} padding="lg">
              <View style={styles.uploadIconCircle}>
                <Ionicons name="arrow-up" size={22} color={colors.accent || colors.teal} />
              </View>
              <Text style={styles.uploadTitle}>Upload your CV and let the matches begin.</Text>
              <Text style={styles.uploadSubtitle}>
                Drag and drop or select a PDF — AI analyzes your skills and matches you with internships.
              </Text>
              <GradientButton
                title="Upload CV"
                color={colors.accent || colors.teal}
                onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
                style={{ marginTop: spacing.lg, width: '100%' }}
              />
            </Card>

            <Text style={styles.sectionEyebrow}>RECOMMENDATIONS FOR YOU</Text>
            <Card style={styles.infoCard} padding="md">
              <Text style={styles.infoTitle}>You can browse even without a CV.</Text>
              <Text style={styles.infoSubtitle}>
                Discover open internships across companies. Once you upload your CV, personalized compatibility fit scores will be calculated automatically.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Internships' })}
                accessibilityRole="button"
                accessibilityLabel="Explore Internship Catalog"
              >
                <Text style={styles.browseButtonText}>Explore Internship Catalog</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.accentStrong || colors.tealDark}
                  style={styles.browseIcon}
                />
              </TouchableOpacity>
            </Card>
          </>
        ) : (
          <>
            {/* CV Analyzed Status Card */}
            <Card style={styles.statusCard} padding="md">
              <Text style={styles.statusLabel}>CV STATUS</Text>
              <Text style={styles.statusTitle}>Your profile has been analyzed.</Text>
              <View style={styles.statusFileRow}>
                <Text style={styles.statusFileName}>CV Document</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Reload CV Document"
                >
                  <Text style={styles.reloadLink}>Reload</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Today's Matchups Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>TODAY'S MATCHUPS</Text>
              {matches.length > 3 ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${matches.length} matches`}
                >
                  <Text style={styles.seeAllLink}>See all ({matches.length})</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Calculating State */}
            {isCalculating && (
              <Card style={styles.calculatingCard} padding="md">
                <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                <Text style={styles.calculatingTitle}>Finding Your Matches...</Text>
                <Text style={styles.calculatingSubtitle}>
                  Evaluating skills fit and semantic profile match ({progressPercent}%)
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
                  onPress={handleStartCalculation}
                  accessibilityRole="button"
                  accessibilityLabel="Try Again"
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* Loading Matches */}
            {matchesLoading && !isCalculating && (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                <Text style={styles.loadingText}>Loading top matches...</Text>
              </View>
            )}

            {/* Matches Error */}
            {matchesError && !matchesLoading && !isCalculating && (
              <Card style={styles.errorCard} padding="md">
                <Ionicons name="alert-circle-outline" size={24} color={colors.danger || '#EF4444'} />
                <Text style={styles.errorText}>{matchesError}</Text>
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

            {/* Empty Matches State */}
            {!matchesLoading && !isCalculating && !matchesError && matches.length === 0 && (
              <Card style={styles.emptyMatchesCard} padding="lg">
                <Ionicons name="sparkles-outline" size={36} color={colors.accent || colors.teal} />
                <Text style={styles.emptyMatchesTitle}>No Calculated Matches Yet</Text>
                <Text style={styles.emptyMatchesSubtitle}>
                  Run our AI matching algorithm to calculate your personalized fit scores against available internships.
                </Text>
                <GradientButton
                  title="Find My Matches"
                  color={colors.accent || colors.teal}
                  onPress={handleStartCalculation}
                  style={{ marginTop: spacing.lg, width: '100%' }}
                />
              </Card>
            )}

            {/* Populated Top Matches */}
            {!matchesLoading && !isCalculating && topMatches.length > 0 && (
              <>
                {/* Highlight First Match */}
                {firstMatch && (
                  <Card variant="highlight" style={styles.highlightCard} padding="md">
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('InternshipDetail', {
                          internshipId: firstMatch.internship.id,
                        })
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${firstMatch.internship.title} at ${firstMatch.internship.company}`}
                    >
                      <View style={styles.highlightTop}>
                        <Ionicons name="flame" size={16} color="#F2812B" style={styles.flameIcon} />
                        <Text style={styles.highlightTitle}>{firstMatch.internship.title}</Text>
                        <MatchBadge score={firstMatch.overall_score} />
                      </View>
                      <Text style={styles.highlightMeta}>
                        {firstMatch.internship.company} · {firstMatch.internship.location}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.whyLinkWrap}
                      onPress={() =>
                        navigation.navigate('WhyYouMatch', {
                          matchId: firstMatch.match_id,
                          internshipId: firstMatch.internship.id,
                        })
                      }
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
                    </TouchableOpacity>
                  </Card>
                )}

                {/* Remaining Top Matches */}
                {remainingMatches.map((item, index) => (
                  <Card
                    key={item.match_id}
                    style={[
                      styles.plainRowCard,
                      index === remainingMatches.length - 1 && { marginBottom: spacing.md },
                    ]}
                    padding="sm"
                  >
                    <TouchableOpacity
                      style={styles.plainRow}
                      onPress={() =>
                        navigation.navigate('InternshipDetail', {
                          internshipId: item.internship.id,
                        })
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.internship.title} at ${item.internship.company}`}
                    >
                      <View style={styles.plainRowMain}>
                        <Text style={styles.plainTitle}>{item.internship.title}</Text>
                        <Text style={styles.plainMeta}>
                          {item.internship.company} · {item.internship.location}
                        </Text>
                      </View>
                      <MatchBadge score={item.overall_score} />
                    </TouchableOpacity>
                  </Card>
                ))}

                {matches.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllMatchupsBtn}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
                    accessibilityRole="button"
                    accessibilityLabel={`View all ${matches.length} matches`}
                  >
                    <Text style={styles.viewAllMatchupsText}>View all {matches.length} matches</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={colors.accentStrong || colors.tealDark}
                      style={styles.arrowIcon}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
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
  headerBlock: {
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    ...typography.sectionTitle,
    color: colors.accentStrong || colors.tealDark,
    letterSpacing: 0.4,
  },
  brandIcon: {
    marginStart: spacing.xxs + 2,
  },
  hello: {
    ...typography.display,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.xs,
  },
  uploadCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    textAlign: 'center',
  },
  uploadSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: colors.textSecondary || colors.textMuted,
    letterSpacing: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  seeAllLink: {
    ...typography.caption,
    color: colors.accentStrong || colors.tealDark,
    fontWeight: '600',
  },
  infoCard: {
    marginTop: spacing.sm,
  },
  infoTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
  },
  infoSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: spacing.minimumTouchTarget,
  },
  browseButtonText: {
    ...typography.button,
    color: colors.accentStrong || colors.tealDark,
    fontSize: 14,
  },
  browseIcon: {
    marginStart: spacing.xs,
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  statusLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary || colors.textMuted,
  },
  statusTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.xxs,
  },
  statusFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
  },
  statusFileName: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary || colors.textDark,
  },
  reloadLink: {
    ...typography.bodyEmphasis,
    color: colors.info || colors.primaryBlue,
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
  calculatingCard: {
    alignItems: 'center',
    marginVertical: spacing.sm,
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
    marginVertical: spacing.sm,
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 13,
  },
  emptyMatchesCard: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  emptyMatchesTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  emptyMatchesSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  viewAllMatchupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderRadius: spacing.radii.md,
    minHeight: spacing.minimumTouchTarget,
  },
  viewAllMatchupsText: {
    ...typography.button,
    color: colors.accentStrong || colors.tealDark,
    fontSize: 13,
  },
  arrowIcon: {
    marginStart: spacing.xs,
  },
});
