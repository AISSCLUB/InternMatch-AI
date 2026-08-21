import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import AppChromeHeader from '../components/AppChromeHeader';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import {
  getApplications,
  updateApplicationStatus,
  ApiError,
} from '../services/api';
import haptics from '../services/haptics';
import { useTabScroll, useTabScrollReporter } from '../context/TabScrollContext';

const STATUS_CONFIG = {
  saved: { bg: colors.surfaceMuted || '#F1F5F9', fg: colors.textSecondary || '#475569', label: 'Saved' },
  applied: { bg: colors.infoSoft || '#E0F2FE', fg: colors.info || '#0284C7', label: 'Applied' },
  interviewing: { bg: colors.warningSoft || '#FEF3C7', fg: colors.warning || '#D97706', label: 'Interviewing' },
  rejected: { bg: colors.dangerSoft || '#FEE2E2', fg: colors.danger || '#DC2626', label: 'Rejected' },
  accepted: { bg: colors.successSoft || '#DCFCE7', fg: colors.success || '#16A34A', label: 'Accepted' },
};

function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.saved;
  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.pillText, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

export default function ApplicationsScreen({ navigation }) {
  const scrollViewRef = useRef(null);
  useTabScroll('Applications', scrollViewRef);
  useScrollToTop(scrollViewRef);
  const onScroll = useTabScrollReporter(20);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const requestGenerationRef = useRef(0);

  const fetchApplicationsData = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setError(null);
    try {
      const res = await getApplications();
      if (generation !== requestGenerationRef.current) return;
      setApplications(res.applications || []);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      console.warn('Failed to fetch applications:', err);
      let msg = 'Unable to load applications.';
      if (err instanceof ApiError) {
        if (err.status === 401) {
          msg = 'Session expired. Please sign in again.';
        } else {
          msg = err.message || msg;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      if (generation !== requestGenerationRef.current) return;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchApplicationsData();
      return () => {
        requestGenerationRef.current += 1;
      };
    }, [fetchApplicationsData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchApplicationsData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickMarkApplied = async (applicationId) => {
    requestGenerationRef.current += 1;
    setStatusUpdatingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, { status: 'applied' });
      haptics.success();
      await fetchApplicationsData();
      Alert.alert('Updated', 'Application marked as applied in your tracker.');
    } catch (err) {
      console.warn('Failed to update status:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      Alert.alert('Error', msg);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderCountBadge = () => {
    if (applications.length === 0 || loading) return null;
    return (
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{applications.length}</Text>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top']}>
      <AppChromeHeader />
      <ScreenHeader
        title="Application Tracker"
        alignment="start"
        rightAction={renderCountBadge()}
      />

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
        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger || '#EF4444'} />
            <Text style={styles.errorTitle}>Could Not Load Tracker</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchApplicationsData}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && applications.length === 0 && (
          <Card style={styles.emptyCard} padding="lg">
            <Ionicons name="briefcase-outline" size={48} color={colors.accent || colors.teal} />
            <Text style={styles.emptyTitle}>No Tracked Applications Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you generate personalized cover letters for your matchups, they will appear here as saved applications.
            </Text>
            <GradientButton
              title="Explore Matchups"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />
          </Card>
        )}

        {/* Real Applications List */}
        {!loading && !error && applications.length > 0 && (
          <View style={styles.listContainer}>
            {applications.map((app) => {
              const hasCoverLetter = Boolean(app.generated_cover_letter);
              const isUpdatingThis = statusUpdatingId === app.id;

              return (
                <Card
                  key={app.id}
                  style={styles.appCard}
                  padding="md"
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.jobTitle}>
                        {app.job_title || 'Internship Application'}
                      </Text>
                      {app.company_name ? (
                        <Text style={styles.companyName}>{app.company_name}</Text>
                      ) : null}
                    </View>
                    <StatusPill status={app.status} />
                  </View>

                  {/* Applied Date */}
                  {app.applied_date ? (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color={colors.textSecondary || colors.textMuted}
                        style={styles.metaIcon}
                      />
                      <Text style={styles.metaText}>
                        Applied on {formatDate(app.applied_date)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Notes */}
                  {app.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{app.notes}</Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() =>
                        navigation.navigate('ApplicationDetail', {
                          applicationId: app.id,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel="View Application Details"
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textPrimary || colors.textDark}
                        style={styles.actionIcon}
                      />
                      <Text style={styles.detailBtnText}>Timeline</Text>
                    </TouchableOpacity>

                    {hasCoverLetter && (
                      <TouchableOpacity
                        style={styles.letterBtn}
                        onPress={() =>
                          navigation.navigate('CoverLetter', {
                            applicationId: app.id,
                            draft: app.generated_cover_letter,
                            currentStatus: app.status,
                            internshipId: app.internship_id,
                            companyName: app.company_name,
                            jobTitle: app.job_title,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel="View Cover Letter"
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={14}
                          color={colors.accentStrong || colors.tealDark}
                          style={styles.actionIcon}
                        />
                        <Text style={styles.letterBtnText}>Cover Letter</Text>
                      </TouchableOpacity>
                    )}

                    {app.internship_id && (
                      <TouchableOpacity
                        style={styles.listingBtn}
                        onPress={() =>
                          navigation.navigate('InternshipDetail', {
                            internshipId: app.internship_id,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel="View Internship Listing"
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      >
                        <Ionicons
                          name="open-outline"
                          size={14}
                          color={colors.textSecondary || colors.textMuted}
                          style={styles.actionIcon}
                        />
                        <Text style={styles.listingBtnText}>Listing</Text>
                      </TouchableOpacity>
                    )}

                    {app.status === 'saved' && (
                      <TouchableOpacity
                        style={styles.markAppliedBtn}
                        onPress={() => handleQuickMarkApplied(app.id)}
                        disabled={isUpdatingThis}
                        accessibilityRole="button"
                        accessibilityLabel="Mark as Applied"
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      >
                        {isUpdatingThis ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.textInverse || colors.white}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={colors.textInverse || colors.white}
                              style={styles.actionIcon}
                            />
                            <Text style={styles.markAppliedBtnText}>Mark Applied</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
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
    paddingBottom: 104,
  },
  countBadge: {
    backgroundColor: colors.accentSoft || '#E6F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 2,
    borderRadius: spacing.radii.pill,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    ...typography.badge,
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
  errorCard: {
    alignItems: 'center',
    marginTop: spacing.md,
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.danger || '#EF4444',
    marginTop: spacing.sm,
  },
  errorSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: spacing.lg,
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
  listContainer: {
    marginTop: spacing.xs,
  },
  appCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
    marginEnd: spacing.md,
  },
  jobTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
  },
  companyName: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderRadius: spacing.radii.sm,
  },
  pillText: {
    ...typography.badge,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaIcon: {
    marginEnd: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
  },
  notesBox: {
    backgroundColor: colors.surfaceSubtle || colors.cardBg,
    borderRadius: spacing.radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
  },
  notesText: {
    ...typography.caption,
    color: colors.textPrimary || colors.textDark,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
    gap: spacing.sm,
  },
  letterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft || '#E6F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    minHeight: 36,
  },
  letterBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface || colors.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    minHeight: 36,
  },
  detailBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary || colors.textDark,
  },
  listingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle || '#F8FAFC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    minHeight: 36,
  },
  listingBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary || colors.textMuted,
  },
  markAppliedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radii.sm,
    marginStart: 'auto',
    minHeight: 36,
  },
  markAppliedBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textInverse || colors.white,
  },
  actionIcon: {
    marginEnd: spacing.xs,
  },
});
