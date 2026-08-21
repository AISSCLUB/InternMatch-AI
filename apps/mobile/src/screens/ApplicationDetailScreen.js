import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import PressableScale from '../components/PressableScale';
import {
  getApplicationDetail,
  updateApplicationStatus,
  ApiError,
} from '../services/api';
import haptics from '../services/haptics';

const CANONICAL_STATUSES = [
  'saved',
  'applied',
  'interviewing',
  'rejected',
  'accepted',
];

const STATUS_CONFIG = {
  saved: {
    bg: colors.surfaceMuted || '#F1F5F9',
    fg: colors.textSecondary || '#475569',
    icon: 'bookmark-outline',
    label: 'Saved',
  },
  applied: {
    bg: colors.infoSoft || '#E0F2FE',
    fg: colors.info || '#0284C7',
    icon: 'send-outline',
    label: 'Applied',
  },
  interviewing: {
    bg: colors.warningSoft || '#FEF3C7',
    fg: colors.warning || '#D97706',
    icon: 'chatbubbles-outline',
    label: 'Interviewing',
  },
  rejected: {
    bg: colors.dangerSoft || '#FEE2E2',
    fg: colors.danger || '#DC2626',
    icon: 'close-circle-outline',
    label: 'Rejected',
  },
  accepted: {
    bg: colors.successSoft || '#DCFCE7',
    fg: colors.success || '#16A34A',
    icon: 'checkmark-circle-outline',
    label: 'Accepted',
  },
};

function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.saved;
  return (
    <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
      <Ionicons
        name={config.icon}
        size={12}
        color={config.fg}
        style={styles.pillIcon}
      />
      <Text style={[styles.statusPillText, { color: config.fg }]}>
        {config.label}
      </Text>
    </View>
  );
}

export default function ApplicationDetailScreen({ route, navigation }) {
  const applicationId =
    route?.params?.applicationId ||
    route?.params?.id ||
    route?.params?.application?.id;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Status mutation state
  const [mutatingStatus, setMutatingStatus] = useState(false);

  // Notes editing state
  const [notesText, setNotesText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const requestGenerationRef = useRef(0);
  const mutationLockRef = useRef(false);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    const generation = ++requestGenerationRef.current;
    if (!applicationId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    setIsNotFound(false);

    try {
      const data = await getApplicationDetail(applicationId);
      if (generation !== requestGenerationRef.current) return;
      setDetail(data);
      setNotesText(data.notes || '');
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load application details.';
        setError(msg);
      }
    } finally {
      if (generation !== requestGenerationRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchDetail();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [fetchDetail]);

  const handleRefresh = async () => {
    if (mutationLockRef.current) return;
    setRefreshing(true);
    await fetchDetail(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!detail || !applicationId || mutatingStatus || savingNotes || isEditingNotes || refreshing || loading || mutationLockRef.current) return;
    if (detail.status === newStatus) return;

    setMutatingStatus(true);
    mutationLockRef.current = true;
    requestGenerationRef.current += 1;
    try {
      await updateApplicationStatus(applicationId, {
        status: newStatus,
        notes: detail.notes,
      });
      haptics.success();
      // Refetch authoritative detail and chronological timeline
      await fetchDetail(true);
    } catch (err) {
      haptics.error();
      const msg =
        err instanceof Error ? err.message : 'Failed to update application status.';
      Alert.alert('Status Update Failed', msg);
    } finally {
      mutationLockRef.current = false;
      setMutatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!detail || !applicationId || savingNotes || mutatingStatus || refreshing || loading || mutationLockRef.current) return;

    setSavingNotes(true);
    mutationLockRef.current = true;
    requestGenerationRef.current += 1;
    try {
      const trimmedNotes = notesText.trim();
      await updateApplicationStatus(applicationId, {
        status: detail.status,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });
      haptics.success();
      setIsEditingNotes(false);
      // Refetch authoritative server state
      await fetchDetail(true);
    } catch (err) {
      haptics.error();
      const msg =
        err instanceof Error ? err.message : 'Failed to save application notes.';
      Alert.alert('Notes Update Failed', msg);
    } finally {
      mutationLockRef.current = false;
      setSavingNotes(false);
    }
  };

  const formatEventDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const timePart = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${datePart} - ${timePart}`;
    } catch {
      return isoString;
    }
  };

  const formatAppliedDate = (dateString) => {
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

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Application Details"
        showBack={true}
        navigation={navigation}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
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
          {/* Loading State */}
          {loading && !refreshing && (
            <View style={styles.centerContainer}>
              <ActivityIndicator
                size="large"
                color={colors.accent || colors.teal}
              />
              <Text style={styles.loadingText}>Loading application details...</Text>
            </View>
          )}

          {/* 404 Not Found State */}
          {!loading && isNotFound && (
            <Card style={styles.notFoundCard} padding="lg">
              <Ionicons
                name="alert-circle-outline"
                size={44}
                color={colors.danger || '#EF4444'}
              />
              <Text style={styles.notFoundTitle}>Application Not Found</Text>
              <Text style={styles.notFoundSubtitle}>
                This application may have been removed or belongs to another candidate account.
              </Text>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Back to Applications"
              >
                <Text style={styles.backBtnText}>Back to Applications</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Error State */}
          {!loading && !isNotFound && error && (
            <Card style={styles.errorCard} padding="lg">
              <Ionicons
                name="cloud-offline-outline"
                size={40}
                color={colors.danger || '#EF4444'}
              />
              <Text style={styles.errorTitle}>Could Not Load Application</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchDetail()}
                accessibilityRole="button"
                accessibilityLabel="Try Again"
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Populated Application Detail */}
          {!loading && !isNotFound && !error && detail && (
            <>
              {/* Hero Information Card */}
              <Card style={styles.heroCard} padding="lg">
                <View style={styles.heroHeader}>
                  <View style={styles.heroTitleWrap}>
                    <Text style={styles.jobTitle}>
                      {detail.job_title || 'Internship Application'}
                    </Text>
                    {detail.company_name ? (
                      <View style={styles.companyRow}>
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color={colors.textSecondary || colors.textMuted}
                          style={styles.companyIcon}
                        />
                        <Text style={styles.companyName}>
                          {detail.company_name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <StatusPill status={detail.status} />
                </View>

                {/* Applied Date Banner if present */}
                {detail.applied_date ? (
                  <View style={styles.appliedDateBanner}>
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={colors.info || '#0284C7'}
                      style={styles.appliedIcon}
                    />
                    <Text style={styles.appliedDateText}>
                      Applied on {formatAppliedDate(detail.applied_date)}
                    </Text>
                  </View>
                ) : null}

                {/* Shortcut Actions Row */}
                <View style={styles.shortcutsRow}>
                  {detail.generated_cover_letter ? (
                    <PressableScale
                      style={styles.shortcutBtnPrimary}
                      onPress={() =>
                        navigation.navigate('CoverLetter', {
                          applicationId: detail.id,
                          draft: detail.generated_cover_letter,
                          currentStatus: detail.status,
                          internshipId: detail.internship_id,
                          companyName: detail.company_name,
                          jobTitle: detail.job_title,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel="View Cover Letter"
                    >
                      <Ionicons
                        name="document-text"
                        size={15}
                        color={colors.accentStrong || colors.tealDark}
                        style={styles.shortcutIcon}
                      />
                      <Text style={styles.shortcutBtnTextPrimary}>
                        Cover Letter
                      </Text>
                    </PressableScale>
                  ) : null}

                  {detail.internship_id ? (
                    <PressableScale
                      style={styles.shortcutBtnSecondary}
                      onPress={() =>
                        navigation.navigate('InternshipDetail', {
                          internshipId: detail.internship_id,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel="View Internship Listing"
                    >
                      <Ionicons
                        name="open-outline"
                        size={15}
                        color={colors.textPrimary || colors.textDark}
                        style={styles.shortcutIcon}
                      />
                      <Text style={styles.shortcutBtnTextSecondary}>
                        View Listing
                      </Text>
                    </PressableScale>
                  ) : null}
                </View>
              </Card>

              {/* Status Selector Card */}
              <Card style={styles.sectionCard} padding="md">
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Update Status</Text>
                  {mutatingStatus && (
                    <ActivityIndicator
                      size="small"
                      color={colors.accent || colors.teal}
                    />
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>
                  Select your current progress with this application:
                </Text>

                <View style={styles.statusChipsGrid}>
                  {CANONICAL_STATUSES.map((statusKey) => {
                    const isSelected = detail.status === statusKey;
                    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.saved;

                    return (
                      <PressableScale
                        key={statusKey}
                        style={[
                          styles.statusChip,
                          isSelected && styles.statusChipSelected,
                          isSelected && { borderColor: config.fg },
                        ]}
                        onPress={() => handleStatusChange(statusKey)}
                        disabled={mutatingStatus || savingNotes || isEditingNotes || refreshing}
                        accessibilityRole="button"
                        accessibilityLabel={`Change status to ${config.label}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Ionicons
                          name={config.icon}
                          size={14}
                          color={
                            isSelected
                              ? config.fg
                              : colors.textSecondary || colors.textMuted
                          }
                          style={styles.chipIcon}
                        />
                        <Text
                          style={[
                            styles.statusChipText,
                            isSelected && {
                              color: config.fg,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </Card>

              {/* Status Timeline Card */}
              <Card style={styles.sectionCard} padding="md">
                <Text style={styles.sectionTitle}>Status Timeline</Text>
                <Text style={styles.sectionSubtitle}>
                  Chronological record of status transitions:
                </Text>

                {detail.timeline && detail.timeline.length > 0 ? (
                  <View style={styles.timelineList}>
                    {detail.timeline.map((event, index) => {
                      const config =
                        STATUS_CONFIG[event.status] || STATUS_CONFIG.saved;
                      const isLast = index === detail.timeline.length - 1;

                      return (
                        <View key={`${event.status}-${event.occurred_at}-${index}`} style={styles.timelineStepRow}>
                          {/* Rail & Marker */}
                          <View style={styles.timelineRailCol}>
                            <View
                              style={[
                                styles.timelineMarker,
                                {
                                  borderColor: config.fg,
                                  backgroundColor: config.bg,
                                },
                              ]}
                            >
                              <Ionicons
                                name={config.icon}
                                size={12}
                                color={config.fg}
                              />
                            </View>
                            {!isLast && <View style={styles.timelineLine} />}
                          </View>

                          {/* Event Details */}
                          <View style={styles.timelineContentWrap}>
                            <View style={styles.timelineHeaderRow}>
                              <Text style={styles.timelineStatusTitle}>
                                {config.label}
                              </Text>
                            </View>
                            <Text style={styles.timelineTimestamp}>
                              {formatEventDate(event.occurred_at)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyTimelineBox}>
                    <Ionicons
                      name="time-outline"
                      size={28}
                      color={colors.textTertiary || colors.textMuted}
                      style={styles.emptyTimelineIcon}
                    />
                    <Text style={styles.emptyTimelineTitle}>
                      No recorded status changes yet.
                    </Text>
                    <Text style={styles.emptyTimelineSubtitle}>
                      When you update this application's status, events will appear here in chronological order.
                    </Text>
                  </View>
                )}
              </Card>

              {/* Notes Card */}
              <Card style={styles.sectionCard} padding="md">
                <View style={styles.notesHeaderRow}>
                  <Text style={styles.sectionTitle}>Personal Notes</Text>
                  {!isEditingNotes ? (
                    <TouchableOpacity
                      style={styles.editNotesToggle}
                      onPress={() => setIsEditingNotes(true)}
                      disabled={mutatingStatus || savingNotes || refreshing}
                      accessibilityRole="button"
                      accessibilityLabel="Edit notes"
                    >
                      <Ionicons
                        name="create-outline"
                        size={15}
                        color={colors.accent || colors.teal}
                      />
                      <Text style={styles.editNotesToggleText}>Edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isEditingNotes ? (
                  <View style={styles.notesEditWrap}>
                    <TextInput
                      style={styles.notesInput}
                      value={notesText}
                      onChangeText={setNotesText}
                      editable={!savingNotes && !mutatingStatus && !refreshing}
                      placeholder="Add private notes about interviews, contacts, or follow-ups..."
                      placeholderTextColor={colors.textTertiary || '#94A3B8'}
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      accessibilityLabel="Personal notes input"
                    />
                    <View style={styles.notesActionsRow}>
                      <TouchableOpacity
                        style={styles.notesCancelBtn}
                        onPress={() => {
                          setNotesText(detail.notes || '');
                          setIsEditingNotes(false);
                        }}
                        disabled={savingNotes || mutatingStatus || refreshing}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel editing notes"
                      >
                        <Text style={styles.notesCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.notesSaveBtn}
                        onPress={handleSaveNotes}
                        disabled={savingNotes || mutatingStatus || refreshing}
                        accessibilityRole="button"
                        accessibilityLabel="Save notes"
                      >
                        {savingNotes ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.textInverse || colors.white}
                          />
                        ) : (
                          <Text style={styles.notesSaveBtnText}>Save Notes</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.notesDisplayBox}>
                    {detail.notes ? (
                      <Text style={styles.notesDisplayText}>{detail.notes}</Text>
                    ) : (
                      <Text style={styles.notesEmptyText}>
                        No notes added yet. Tap Edit to add details like interview dates or interviewers.
                      </Text>
                    )}
                  </View>
                )}
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl * 2,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.md,
  },
  notFoundCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  notFoundTitle: {
    ...typography.h3,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backBtn: {
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd || 10,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse || colors.white,
    fontWeight: '600',
  },
  errorCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.danger || '#EF4444',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd || 10,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse || colors.white,
    fontWeight: '600',
  },
  heroCard: {
    marginBottom: spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitleWrap: {
    flex: 1,
    marginEnd: spacing.sm,
  },
  jobTitle: {
    ...typography.h2,
    color: colors.textPrimary || colors.textDark,
    fontWeight: '700',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs + 2,
  },
  companyIcon: {
    marginEnd: spacing.xs,
  },
  companyName: {
    ...typography.bodyMedium,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: spacing.radiusSm || 8,
  },
  pillIcon: {
    marginEnd: spacing.xxs + 2,
  },
  statusPillText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  appliedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoSoft || '#E0F2FE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    marginTop: spacing.md,
  },
  appliedIcon: {
    marginEnd: spacing.xs,
  },
  appliedDateText: {
    ...typography.caption,
    color: colors.info || '#0284C7',
    fontWeight: '600',
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shortcutBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderWidth: 1,
    borderColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    minHeight: 38,
  },
  shortcutIcon: {
    marginEnd: spacing.xs,
  },
  shortcutBtnTextPrimary: {
    ...typography.caption,
    color: colors.accentStrong || colors.tealDark,
    fontWeight: '600',
  },
  shortcutBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted || '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border || '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    minHeight: 38,
  },
  shortcutIcon: {
    marginEnd: spacing.xs,
  },
  shortcutBtnTextSecondary: {
    ...typography.caption,
    color: colors.textPrimary || colors.textDark,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary || colors.textDark,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  statusChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted || '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border || '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    minHeight: 36,
  },
  statusChipSelected: {
    backgroundColor: colors.surface || colors.white,
    borderWidth: 1.5,
  },
  chipIcon: {
    marginEnd: spacing.xs,
  },
  statusChipText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '500',
  },
  timelineList: {
    marginTop: spacing.xs,
  },
  timelineStepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineRailCol: {
    alignItems: 'center',
    width: 28,
    marginEnd: spacing.sm,
  },
  timelineMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border || '#E2E8F0',
    marginVertical: 2,
  },
  timelineContentWrap: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineStatusTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary || colors.textDark,
    fontWeight: '600',
  },
  timelineTimestamp: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  emptyTimelineBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted || '#F8FAFC',
    borderRadius: spacing.radiusSm || 8,
    borderWidth: 1,
    borderColor: colors.border || '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTimelineIcon: {
    marginBottom: spacing.xs,
  },
  emptyTimelineTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyTimelineSubtitle: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  editNotesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  editNotesToggleText: {
    ...typography.caption,
    color: colors.accent || colors.teal,
    fontWeight: '600',
    marginStart: spacing.xxs + 2,
  },
  notesDisplayBox: {
    backgroundColor: colors.surfaceMuted || '#F8FAFC',
    padding: spacing.md,
    borderRadius: spacing.radiusSm || 8,
    borderWidth: 1,
    borderColor: colors.border || '#E2E8F0',
    minHeight: 60,
  },
  notesDisplayText: {
    ...typography.bodyMedium,
    color: colors.textPrimary || colors.textDark,
    lineHeight: 20,
  },
  notesEmptyText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    fontStyle: 'italic',
  },
  notesEditWrap: {
    marginTop: spacing.xxs,
  },
  notesInput: {
    ...typography.bodyMedium,
    backgroundColor: colors.surface || colors.white,
    borderWidth: 1,
    borderColor: colors.accent || colors.teal,
    borderRadius: spacing.radiusSm || 8,
    padding: spacing.md,
    color: colors.textPrimary || colors.textDark,
    minHeight: 90,
  },
  notesActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  notesCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesCancelBtnText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    fontWeight: '600',
  },
  notesSaveBtn: {
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.radiusSm || 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesSaveBtnText: {
    ...typography.caption,
    color: colors.textInverse || colors.white,
    fontWeight: '600',
  },
});
