import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedErrorMessage } from '../localization/errorMessages';
import { useLocalization } from '../localization/LocalizationContext';
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
import { useScrollToTop } from '@react-navigation/native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import motionTokens from '../motion/motionTokens';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import PressableCard from '../components/PressableCard';
import PressableScale from '../components/PressableScale';
import GradientButton from '../components/GradientButton';
import MatchBadge from '../components/MatchBadge';
import Reveal from '../components/motion/Reveal';
import MatchIntelligenceOrb from '../components/motion/MatchIntelligenceOrb';
import AIPulse from '../components/motion/AIPulse';
import AppChromeHeader from '../components/AppChromeHeader';
import { useProfile } from '../context/ProfileContext';
import { useTabScroll, useTabScrollReporter } from '../context/TabScrollContext';
import { getMatches } from '../services/api';
import { useMatchCalculation } from '../hooks/useMatchCalculation';

export default function HomeScreen({ navigation }) {
  const { profile, refreshProfile } = useProfile();
  const { t } = useTranslation();
  const { isRTL } = useLocalization();
  const displayName = profile?.full_name?.trim() || t('home.studentFallback');

  const scrollViewRef = useRef(null);
  useTabScroll('Home', scrollViewRef);
  useScrollToTop(scrollViewRef);
  const onScroll = useTabScrollReporter(20);

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
  const calculationErrorMessage = calculationError ? getLocalizedErrorMessage({ code: calculationError }, t) : null;
  const matchesErrorMessage = matchesError ? getLocalizedErrorMessage({ code: matchesError }, t) : null;

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
      const errorCode = 'MATCHES_LOAD_FAILED';
      setMatchesError(errorCode);
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
      <AppChromeHeader />

      <ScrollView
        ref={scrollViewRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent || colors.teal]}
            tintColor={colors.accent || colors.teal}
          />
        }
      >
        {/* Sequence 1: Greeting */}
        <Reveal delay={0}>
          <View style={styles.headerBlock}>
            {isRTL ? (
              <Text style={[styles.hello, styles.rtlText]} numberOfLines={2}>
                <Text style={styles.rtlWriting}>{t('home.greetingHello', { defaultValue: 'أهلاً' })}, </Text>
                <Text style={{ writingDirection: 'ltr' }}>{displayName}</Text>
                <Text> {'\u{1F44B}'}</Text>
              </Text>
            ) : (
              <Text style={styles.hello} numberOfLines={2}>
                {t('home.greeting', { name: displayName })} {'\u{1F44B}'}
              </Text>
            )}
          </View>
        </Reveal>

        {/* Sequence 2: Signature Match Intelligence Hero Orb */}
        <Reveal delay={motionTokens.stagger.fast}>
          <MatchIntelligenceOrb
            score={firstMatch?.overall_score}
            topMatch={firstMatch}
            hasAnalyzedCV={hasAnalyzedCV}
            isCalculating={isCalculating}
            progressPercent={progressPercent}
          />
        </Reveal>

        {!hasAnalyzedCV ? (
          <>
            {/* Sequence 3: Upload CV Prompt Card */}
            <Reveal delay={motionTokens.stagger.normal}>
              <Card style={styles.uploadCard} padding="lg">
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="arrow-up" size={22} color={colors.accent || colors.teal} />
                </View>
                <Text style={[styles.uploadTitle, isRTL && styles.rtlWriting]}>{t('home.upload.title')}</Text>
                <Text style={[styles.uploadSubtitle, isRTL && styles.rtlWriting]}>
                  {t('home.upload.subtitle')}
                </Text>
                <GradientButton
                  title={t('home.upload.button')}
                  color={colors.accent || colors.teal}
                  onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
                  style={{ marginTop: spacing.lg, width: '100%' }}
                />
              </Card>
            </Reveal>

            {/* Sequence 4: Recommendation browsing card */}
            <Reveal delay={motionTokens.stagger.slow}>
              <Text style={[styles.sectionEyebrow, isRTL && styles.rtlText]}>{t('home.recommendations.eyebrow')}</Text>
              <Card style={styles.infoCard} padding="md">
                <Text style={[styles.infoTitle, isRTL && styles.rtlText]}>{t('home.recommendations.title')}</Text>
                <Text style={[styles.infoSubtitle, isRTL && styles.rtlText]}>
                  {t('home.recommendations.subtitle')}
                </Text>
                <TouchableOpacity
                  style={[styles.browseButton, isRTL && styles.rowRTL]}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Internships' })}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.recommendations.explore')}
                >
                  <Text style={[styles.browseButtonText, isRTL && styles.rtlText]}>{t('home.recommendations.explore')}</Text>
                  <Ionicons
                    name={isRTL ? 'arrow-back' : 'arrow-forward'}
                    size={16}
                    color={colors.accentStrong || colors.tealDark}
                    style={[styles.browseIcon, isRTL && styles.browseIconRTL]}
                  />
                </TouchableOpacity>
              </Card>
            </Reveal>
          </>
        ) : (
          <>
            {/* Sequence 3: CV Analyzed Status Card */}
            <Reveal delay={motionTokens.stagger.normal}>
              <Card style={styles.statusCard} padding="md">
                <Text style={[styles.statusLabel, isRTL && styles.rtlText]}>{t('home.cvStatus.eyebrow')}</Text>
                <Text style={[styles.statusTitle, isRTL && styles.rtlText]}>{t('home.cvStatus.analyzed')}</Text>
                <View style={[styles.statusFileRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.statusFileName, isRTL && styles.rtlText]}>{t('home.cvStatus.document')}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.cvStatus.reloadA11y')}
                  >
                    <Text style={[styles.reloadLink, isRTL && styles.rtlText]}>{t('home.cvStatus.reload')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </Reveal>

            {/* Sequence 4: Today's Matchups Section */}
            <Reveal delay={motionTokens.stagger.slow}>
              <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.sectionEyebrow, isRTL && styles.rtlText]}>{t('home.matchups.eyebrow')}</Text>
                {matches.length > 3 ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.matchups.seeAllA11y', { total: matches.length })}
                  >
                    <Text style={[styles.seeAllLink, isRTL && styles.rtlText]}>{t('home.matchups.seeAll', { total: matches.length })}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Calculating State with Ambient AIPulse */}
              {isCalculating && (
                <AIPulse active={isCalculating} style={styles.calculatingPulseWrap}>
                  <Card style={styles.calculatingCard} padding="md">
                    <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                    <Text style={[styles.calculatingTitle, isRTL && styles.rtlWriting]}>{t('home.calculation.finding')}</Text>
                    <Text style={[styles.calculatingSubtitle, isRTL && styles.rtlWriting]}>
                      {t('home.calculation.evaluating', { progress: progressPercent })}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <TouchableOpacity
                      style={styles.cancelCalcBtn}
                      onPress={cancelCalculation}
                      accessibilityRole="button"
                      accessibilityLabel={t('home.calculation.stop')}
                    >
                      <Text style={[styles.cancelCalcText, isRTL && styles.rtlWriting]}>{t('home.calculation.stop')}</Text>
                    </TouchableOpacity>
                  </Card>
                </AIPulse>
              )}

              {/* Calculation Error */}
              {calculationError && (
                <Card style={styles.errorCard} padding="md">
                  <Ionicons name="alert-circle-outline" size={24} color={colors.danger || '#EF4444'} />
                  <Text style={[styles.errorText, isRTL && styles.rtlWriting]}>{calculationErrorMessage}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={handleStartCalculation}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.calculation.tryAgain')}
                  >
                    <Text style={[styles.retryBtnText, isRTL && styles.rtlWriting]}>{t('home.calculation.tryAgain')}</Text>
                  </TouchableOpacity>
                </Card>
              )}

              {/* Loading Matches */}
              {matchesLoading && !isCalculating && (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                  <Text style={[styles.loadingText, isRTL && styles.rtlWriting]}>{t('home.matches.loading')}</Text>
                </View>
              )}

              {/* Matches Error */}
              {matchesError && !matchesLoading && !isCalculating && (
                <Card style={styles.errorCard} padding="md">
                  <Ionicons name="alert-circle-outline" size={24} color={colors.danger || '#EF4444'} />
                  <Text style={[styles.errorText, isRTL && styles.rtlWriting]}>{matchesErrorMessage}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={fetchMatchesData}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.matches.retry')}
                  >
                    <Text style={[styles.retryBtnText, isRTL && styles.rtlWriting]}>{t('home.matches.retry')}</Text>
                  </TouchableOpacity>
                </Card>
              )}

              {/* Empty Matches State */}
              {!matchesLoading && !isCalculating && !matchesError && matches.length === 0 && (
                <Card style={styles.emptyMatchesCard} padding="lg">
                  <Ionicons name="sparkles-outline" size={36} color={colors.accent || colors.teal} />
                  <Text style={[styles.emptyMatchesTitle, isRTL && styles.rtlWriting]}>{t('home.matches.emptyTitle')}</Text>
                  <Text style={[styles.emptyMatchesSubtitle, isRTL && styles.rtlWriting]}>
                    {t('home.matches.emptySubtitle')}
                  </Text>
                  <GradientButton
                    title={t('home.matches.find')}
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
                      <PressableScale
                        onPress={() =>
                          navigation.navigate('InternshipDetail', {
                            internshipId: firstMatch.internship.id,
                          })
                        }
                        scaleTo={0.985}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={t('home.matches.internshipAtCompany', { title: firstMatch.internship.title, company: firstMatch.internship.company })}
                      >
                        <View style={[styles.highlightTop, isRTL && styles.rowRTL]}>
                          <Ionicons name="flame" size={16} color="#F2812B" style={[styles.flameIcon, isRTL && styles.flameIconRTL]} />
                          <Text style={[styles.highlightTitle, isRTL && styles.highlightTitleRTL]}>{firstMatch.internship.title}</Text>
                          <MatchBadge score={firstMatch.overall_score} />
                        </View>
                        <Text style={styles.highlightMeta}>
                          {firstMatch.internship.company} {'\u00b7'} {firstMatch.internship.location}
                        </Text>
                      </PressableScale>

                      <PressableScale
                        style={[styles.whyLinkWrap, isRTL && styles.rowRTL]}
                        onPress={() =>
                          navigation.navigate('WhyYouMatch', {
                            matchId: firstMatch.match_id,
                            internshipId: firstMatch.internship.id,
                          })
                        }
                        scaleTo={0.98}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={t('home.matches.whyA11y')}
                      >
                        <Text style={[styles.whyLink, isRTL && styles.rtlText]}>{t('home.matches.why')}</Text>
                        <Ionicons
                          name={isRTL ? 'chevron-back' : 'chevron-forward'}
                          size={14}
                          color={colors.primaryBlue}
                          style={[styles.chevronIcon, isRTL && styles.chevronIconRTL]}
                        />
                      </PressableScale>
                    </Card>
                  )}

                  {/* Remaining Top Matches */}
                  {remainingMatches.map((item, index) => (
                    <PressableCard
                      key={item.match_id}
                      style={[
                        styles.plainRowCard,
                        index === remainingMatches.length - 1 && { marginBottom: spacing.md },
                      ]}
                      padding="sm"
                      onPress={() =>
                        navigation.navigate('InternshipDetail', {
                          internshipId: item.internship.id,
                        })
                      }
                      accessibilityLabel={t('home.matches.internshipAtCompany', { title: item.internship.title, company: item.internship.company })}
                    >
                      <View style={[styles.plainRow, isRTL && styles.rowRTL]}>
                        <View style={[styles.plainRowMain, isRTL && styles.plainRowMainRTL]}>
                          <Text style={styles.plainTitle}>{item.internship.title}</Text>
                          <Text style={styles.plainMeta}>
                            {item.internship.company} {'\u00b7'} {item.internship.location}
                          </Text>
                        </View>
                        <MatchBadge score={item.overall_score} />
                      </View>
                    </PressableCard>
                  ))}

                  {matches.length > 3 && (
                    <TouchableOpacity
                      style={[styles.viewAllMatchupsBtn, isRTL && styles.rowRTL]}
                      onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
                      accessibilityRole="button"
                      accessibilityLabel={t('home.matches.viewAll', { total: matches.length })}
                    >
                      <Text style={[styles.viewAllMatchupsText, isRTL && styles.rtlText]}>{t('home.matches.viewAll', { total: matches.length })}</Text>
                      <Ionicons
                        name={isRTL ? 'arrow-back' : 'arrow-forward'}
                        size={16}
                        color={colors.accentStrong || colors.tealDark}
                        style={[styles.arrowIcon, isRTL && styles.arrowIconRTL]}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
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
    paddingTop: spacing.xs,
    paddingBottom: 128,
  },
  headerBlock: {
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  hello: {
    ...typography.display,
    color: colors.textPrimary || colors.textDark,
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
    marginTop: spacing.md,
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
    fontSize: 13,
  },
  browseIcon: {
    marginStart: spacing.xs,
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  statusLabel: {
    ...typography.eyebrow,
    color: colors.accentStrong || colors.tealDark,
  },
  statusTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.xs,
  },
  statusFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
  },
  statusFileName: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
  },
  reloadLink: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent || colors.teal,
  },
  calculatingPulseWrap: {
    marginBottom: spacing.md,
  },
  calculatingCard: {
    alignItems: 'center',
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
  centerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.sm,
  },
  emptyMatchesCard: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyMatchesTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.sm,
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
  rtlWriting: {
    writingDirection: 'rtl',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  browseIconRTL: {
    marginStart: 0,
    marginEnd: spacing.xs,
  },
  flameIconRTL: {
    marginEnd: 0,
    marginStart: spacing.xs,
  },
  highlightTitleRTL: {
    marginEnd: 0,
    marginStart: spacing.sm,
  },
  chevronIconRTL: {
    marginStart: 0,
    marginEnd: spacing.xxs,
  },
  plainRowMainRTL: {
    marginEnd: 0,
    marginStart: spacing.md,
  },
  arrowIconRTL: {
    marginStart: 0,
    marginEnd: spacing.xs,
  },
});
