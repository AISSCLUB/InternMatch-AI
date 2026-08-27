import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useLocalization } from '../localization/LocalizationContext';
import { formatLocalizedDate } from '../localization/formatters';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Chip from '../components/Chip';
import MatchBadge from '../components/MatchBadge';
import Reveal from '../components/motion/Reveal';
import { getEmployerApplicantDetail, updateEmployerApplicantStatus } from '../services/api';

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'applied':
      return {
        bg: colors.infoSoft || '#E0F2FE',
        fg: colors.info || '#0284C7',
      };
    case 'interviewing':
      return {
        bg: colors.warningSoft || '#FEF3C7',
        fg: colors.warning || '#D97706',
      };
    case 'accepted':
      return {
        bg: colors.successSoft || '#DCFCE7',
        fg: colors.success || '#10B981',
      };
    case 'rejected':
      return {
        bg: colors.dangerSoft || '#FEE2E2',
        fg: colors.danger || '#EF4444',
      };
    default:
      return {
        bg: '#EDEDED',
        fg: colors.textMuted,
      };
  }
}

export default function EmployerApplicantDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { locale, isRTL } = useLocalization();
  const insets = useSafeAreaInsets();

  const { internshipId, applicationId, applicant: initialApplicant } = route.params || {};

  const [applicant, setApplicant] = useState(initialApplicant || null);
  const [loading, setLoading] = useState(!initialApplicant);
  const [refreshing, setRefreshing] = useState(false);
  const [mutatingStatus, setMutatingStatus] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (!internshipId || !applicationId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else if (!applicant) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await getEmployerApplicantDetail(internshipId, applicationId);
        setApplicant(res);
      } catch (err) {
        console.warn('Failed to load employer applicant detail:', err);
        if (!applicant) {
          setError('LOAD_FAILED');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [internshipId, applicationId, applicant]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRefresh = () => {
    fetchDetail(true);
  };

  const handleUpdateStatus = useCallback(
    async (newStatus, notes) => {
      if (!internshipId || !applicationId || mutatingStatus) return;

      setMutatingStatus(true);
      try {
        const updated = await updateEmployerApplicantStatus(internshipId, applicationId, {
          status: newStatus,
          notes,
        });
        setApplicant((prev) => ({
          ...prev,
          status: updated.status || newStatus,
          updated_at: updated.updated_at || prev.updated_at,
        }));
      } catch (err) {
        console.warn('Failed to update applicant status:', err);
        Alert.alert(
          t('common.error', 'Error'),
          t('employerApplicantDetail.updateStatusError', 'Failed to update applicant status. Please try again.')
        );
      } finally {
        setMutatingStatus(false);
      }
    },
    [internshipId, applicationId, mutatingStatus, t]
  );

  const confirmAccept = useCallback(() => {
    Alert.alert(
      t('employerApplicantDetail.acceptAlertTitle', 'Accept Candidate?'),
      t(
        'employerApplicantDetail.acceptAlertMessage',
        'This will mark the application as Accepted. The candidate will see their acceptance in their application tracker.'
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('employerApplicantDetail.acceptBtn', 'Accept Candidate'),
          onPress: () => handleUpdateStatus('accepted'),
        },
      ]
    );
  }, [t, handleUpdateStatus]);

  const confirmReject = useCallback(() => {
    Alert.alert(
      t('employerApplicantDetail.rejectAlertTitle', 'Reject Candidate?'),
      t(
        'employerApplicantDetail.rejectAlertMessage',
        'This will mark the application as Rejected. This action cannot be undone.'
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('employerApplicantDetail.rejectBtn', 'Reject Candidate'),
          style: 'destructive',
          onPress: () => handleUpdateStatus('rejected'),
        },
      ]
    );
  }, [t, handleUpdateStatus]);

  const candidate = applicant?.candidate;
  const statusStyle = getStatusBadgeStyle(applicant?.status);
  const appliedDateStr = applicant?.applied_date
    ? formatLocalizedDate(applicant.applied_date, locale)
    : '';

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title={candidate?.full_name || t('employerApplicantDetail.title')}
        subtitle={candidate?.department || undefined}
        showBack
        navigation={navigation}
        alignment="center"
        bordered
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
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
        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={[styles.loadingText, isRTL && styles.rtlWriting]}>
              {t('employerApplicantDetail.loading')}
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && !applicant && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={32} color={colors.danger || '#EF4444'} />
            <Text style={[styles.errorTitle, isRTL && styles.rtlWriting]}>
              {t('employerApplicantDetail.errorTitle')}
            </Text>
            <Text style={[styles.errorSubtitle, isRTL && styles.rtlWriting]}>
              {t('employerApplicantDetail.errorSubtitle')}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchDetail()}
              accessibilityRole="button"
              accessibilityLabel={t('employerApplicantDetail.retry')}
            >
              <Text style={styles.retryBtnText}>{t('employerApplicantDetail.retry')}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Populated Content */}
        {applicant && (
          <>
            {/* Sequence 1: Candidate Overview Card */}
            <Reveal delay={0}>
              <Card style={styles.overviewCard} padding="lg">
                <View style={[styles.overviewHeader, isRTL && styles.rowRTL]}>
                  <View style={styles.candidateAvatarCircle}>
                    <Ionicons name="person" size={28} color={colors.accentStrong || colors.tealDark} />
                  </View>
                  <View style={styles.overviewInfo}>
                    <Text style={[styles.candidateFullName, isRTL && styles.rtlText]} numberOfLines={1}>
                      {candidate?.full_name}
                    </Text>
                    {candidate?.headline ? (
                      <Text style={[styles.headlineText, isRTL && styles.rtlText]}>
                        {candidate.headline}
                      </Text>
                    ) : null}
                    {candidate?.department ? (
                      <Text style={[styles.departmentText, isRTL && styles.rtlText]}>
                        {candidate.department}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Match score section if available */}
                {typeof applicant.match_score === 'number' && (
                  <View style={[styles.matchScoreRow, isRTL && styles.rowRTL]}>
                    <Text style={[styles.matchScoreLabel, isRTL && styles.rtlText]}>
                      {t('employerApplicantDetail.matchScoreLabel')}
                    </Text>
                    <MatchBadge score={applicant.match_score} />
                  </View>
                )}
              </Card>
            </Reveal>

            {/* Sequence 2: Application Details & Recruiter Action Controls */}
            <Reveal delay={30}>
              <Card style={styles.metaCard} padding="md">
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  {t('employerApplicantDetail.applicationStatus')}
                </Text>
                <View style={[styles.statusRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>
                      {applicant.status}
                    </Text>
                  </View>
                  {appliedDateStr ? (
                    <Text style={[styles.appliedDateText, isRTL && styles.rtlText]}>
                      {t('employerApplicantDetail.appliedOn', { date: appliedDateStr })}
                    </Text>
                  ) : null}
                </View>

                {/* Recruiter Lifecycle Actions */}
                <View style={styles.actionsDivider} />
                <Text style={[styles.actionsHeading, isRTL && styles.rtlText]}>
                  {t('employerApplicantDetail.actionsHeading', 'Recruiter Decision')}
                </Text>

                {mutatingStatus ? (
                  <View style={styles.actionLoadingRow}>
                    <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                    <Text style={[styles.actionLoadingText, isRTL && styles.rtlText]}>
                      {t('employerApplicantDetail.updatingStatus', 'Updating candidate status...')}
                    </Text>
                  </View>
                ) : (
                  <>
                    {applicant.status === 'applied' && (
                      <View style={styles.actionButtonsCol}>
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, isRTL && styles.rowRTL]}
                          onPress={() => handleUpdateStatus('interviewing')}
                          accessibilityRole="button"
                          accessibilityLabel={t('employerApplicantDetail.moveToInterview', 'Move to Interview')}
                        >
                          <Ionicons name="chatbubbles-outline" size={16} color={colors.textInverse || colors.white} />
                          <Text style={styles.primaryActionBtnText}>
                            {t('employerApplicantDetail.moveToInterview', 'Move to Interview')}
                          </Text>
                        </TouchableOpacity>

                        <View style={[styles.secondaryActionRow, isRTL && styles.rowRTL]}>
                          <TouchableOpacity
                            style={[styles.acceptBtn, isRTL && styles.rowRTL]}
                            onPress={confirmAccept}
                            accessibilityRole="button"
                            accessibilityLabel={t('employerApplicantDetail.acceptBtn', 'Accept Candidate')}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" />
                            <Text style={styles.acceptBtnText}>
                              {t('employerApplicantDetail.acceptBtn', 'Accept Candidate')}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.rejectBtn, isRTL && styles.rowRTL]}
                            onPress={confirmReject}
                            accessibilityRole="button"
                            accessibilityLabel={t('employerApplicantDetail.rejectBtn', 'Reject Candidate')}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#991B1B" />
                            <Text style={styles.rejectBtnText}>
                              {t('employerApplicantDetail.rejectBtn', 'Reject Candidate')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {applicant.status === 'interviewing' && (
                      <View style={styles.actionButtonsCol}>
                        <View style={styles.interviewingBanner}>
                          <Ionicons name="time-outline" size={18} color="#D97706" />
                          <Text style={[styles.interviewingBannerText, isRTL && styles.rtlText]}>
                            {t('employerApplicantDetail.inInterviewBanner', 'Candidate is currently in the interview stage.')}
                          </Text>
                        </View>

                        <View style={[styles.secondaryActionRow, isRTL && styles.rowRTL]}>
                          <TouchableOpacity
                            style={[styles.acceptBtn, isRTL && styles.rowRTL]}
                            onPress={confirmAccept}
                            accessibilityRole="button"
                            accessibilityLabel={t('employerApplicantDetail.acceptBtn', 'Accept Candidate')}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" />
                            <Text style={styles.acceptBtnText}>
                              {t('employerApplicantDetail.acceptBtn', 'Accept Candidate')}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.rejectBtn, isRTL && styles.rowRTL]}
                            onPress={confirmReject}
                            accessibilityRole="button"
                            accessibilityLabel={t('employerApplicantDetail.rejectBtn', 'Reject Candidate')}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#991B1B" />
                            <Text style={styles.rejectBtnText}>
                              {t('employerApplicantDetail.rejectBtn', 'Reject Candidate')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {applicant.status === 'accepted' && (
                      <View style={styles.terminalBannerAccepted}>
                        <Ionicons name="checkmark-done-circle" size={22} color="#10B981" />
                        <View style={styles.terminalBannerTextCol}>
                          <Text style={[styles.terminalAcceptedTitle, isRTL && styles.rtlText]}>
                            {t('employerApplicantDetail.acceptedBannerTitle', 'Offer Accepted')}
                          </Text>
                          <Text style={[styles.terminalSubtitle, isRTL && styles.rtlText]}>
                            {t('employerApplicantDetail.acceptedBannerSubtitle', 'This candidate has been accepted for the internship.')}
                          </Text>
                        </View>
                      </View>
                    )}

                    {applicant.status === 'rejected' && (
                      <View style={styles.terminalBannerRejected}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                        <View style={styles.terminalBannerTextCol}>
                          <Text style={[styles.terminalRejectedTitle, isRTL && styles.rtlText]}>
                            {t('employerApplicantDetail.rejectedBannerTitle', 'Application Closed')}
                          </Text>
                          <Text style={[styles.terminalSubtitle, isRTL && styles.rtlText]}>
                            {t('employerApplicantDetail.rejectedBannerSubtitle', 'Candidate was not selected for this position.')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </Card>
            </Reveal>

            {/* Sequence 3: Candidate Skills */}
            <Reveal delay={60}>
              <Card style={styles.skillsCard} padding="md">
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  {t('employerApplicantDetail.skillsTitle')}
                </Text>
                {candidate?.skills && candidate.skills.length > 0 ? (
                  <View style={[styles.skillsChipRow, isRTL && styles.rowRTL]}>
                    {candidate.skills.map((sk) => (
                      <Chip key={sk} label={sk} variant="skill" />
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
                    {t('employerApplicantDetail.noSkills')}
                  </Text>
                )}
              </Card>
            </Reveal>

            {/* Sequence 4: Generated Cover Letter */}
            <Reveal delay={90}>
              <Card style={styles.letterCard} padding="lg">
                <View style={[styles.letterHeader, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={colors.accent || colors.teal}
                    style={isRTL ? styles.iconRTL : styles.iconLTR}
                  />
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    {t('employerApplicantDetail.coverLetterTitle')}
                  </Text>
                </View>

                {applicant.generated_cover_letter ? (
                  <Text style={[styles.letterBody, isRTL && styles.rtlWriting]}>
                    {applicant.generated_cover_letter}
                  </Text>
                ) : (
                  <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
                    {t('employerApplicantDetail.noCoverLetter')}
                  </Text>
                )}
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
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.sm,
  },
  errorCard: {
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: '#FEF2F2',
    borderColor: colors.dangerSoft || '#FEE2E2',
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.danger || '#EF4444',
    marginTop: spacing.sm,
  },
  errorSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
    textAlign: 'center',
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
  overviewCard: {
    marginBottom: spacing.xs,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  overviewInfo: {
    flex: 1,
  },
  candidateFullName: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.textPrimary || colors.textDark,
  },
  headlineText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: 2,
  },
  departmentText: {
    ...typography.caption,
    color: colors.accentStrong || colors.tealDark,
    fontWeight: '600',
    marginTop: 2,
  },
  matchScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
  },
  matchScoreLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.textSecondary || colors.textMuted,
  },
  metaCard: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radii.pill,
  },
  statusPillText: {
    ...typography.badge,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  appliedDateText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
  },
  actionsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle || colors.border,
    marginVertical: spacing.md,
  },
  actionsHeading: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary || colors.textMuted,
    marginBottom: spacing.sm,
  },
  actionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  actionLoadingText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
  },
  actionButtonsCol: {
    gap: spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent || colors.teal,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    gap: spacing.xs,
  },
  primaryActionBtnText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 14,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    gap: 4,
  },
  acceptBtnText: {
    ...typography.button,
    color: '#065F46',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    gap: 4,
  },
  rejectBtnText: {
    ...typography.button,
    color: '#991B1B',
    fontSize: 13,
  },
  interviewingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.sm,
    gap: spacing.xs,
  },
  interviewingBannerText: {
    flex: 1,
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
  },
  terminalBannerAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.radii.sm,
    gap: spacing.sm,
  },
  terminalBannerRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.radii.sm,
    gap: spacing.sm,
  },
  terminalBannerTextCol: {
    flex: 1,
  },
  terminalAcceptedTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  terminalRejectedTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  terminalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: 2,
  },
  skillsCard: {
    marginBottom: spacing.xs,
  },
  skillsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  letterCard: {
    marginBottom: spacing.md,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  letterBody: {
    ...typography.bodySecondary,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary || colors.textDark,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  iconLTR: {
    marginEnd: spacing.xs,
  },
  iconRTL: {
    marginStart: spacing.xs,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rtlWriting: {
    writingDirection: 'rtl',
  },
});
