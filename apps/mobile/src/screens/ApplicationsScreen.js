import React, { useEffect, useState, useCallback } from 'react';
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
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';
import {
  getApplications,
  updateApplicationStatus,
  ApiError,
} from '../services/api';

const STATUS_CONFIG = {
  saved: { bg: '#F1F5F9', fg: '#475569', label: 'Saved' },
  applied: { bg: '#E0F2FE', fg: '#0284C7', label: 'Applied' },
  interviewing: { bg: '#FEF3C7', fg: '#D97706', label: 'Interviewing' },
  rejected: { bg: '#FEE2E2', fg: '#DC2626', label: 'Rejected' },
  accepted: { bg: '#DCFCE7', fg: '#16A34A', label: 'Accepted' },
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
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const fetchApplicationsData = useCallback(async () => {
    setError(null);
    try {
      const res = await getApplications();
      setApplications(res.applications || []);
    } catch (err) {
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplicationsData();
  }, [fetchApplicationsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchApplicationsData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickMarkApplied = async (applicationId) => {
    setStatusUpdatingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, { status: 'applied' });
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.teal]}
          tintColor={colors.teal}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Application Tracker</Text>
        {applications.length > 0 && !loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{applications.length}</Text>
          </View>
        )}
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      )}

      {/* Error State */}
      {!loading && error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.red || '#EF4444'} />
          <Text style={styles.errorTitle}>Could Not Load Tracker</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchApplicationsData}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && applications.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="briefcase-outline" size={48} color={colors.teal} />
          <Text style={styles.emptyTitle}>No Tracked Applications Yet</Text>
          <Text style={styles.emptySubtitle}>
            When you generate personalized cover letters for your matchups, they will appear here as saved applications.
          </Text>
          <GradientButton
            title="Explore Matchups"
            color={colors.teal}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
            style={{ marginTop: 20, width: '100%' }}
          />
        </View>
      )}

      {/* Real Applications List */}
      {!loading && !error && applications.length > 0 && (
        <View style={styles.listContainer}>
          {applications.map((app) => {
            const hasCoverLetter = Boolean(app.generated_cover_letter);
            const isUpdatingThis = statusUpdatingId === app.id;

            return (
              <View key={app.id} style={styles.card}>
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
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
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
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={14}
                        color={colors.tealDark}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.letterBtnText}>Cover Letter</Text>
                    </TouchableOpacity>
                  )}

                  {app.internship_id && (
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() =>
                        navigation.navigate('InternshipDetail', {
                          internshipId: app.internship_id,
                        })
                      }
                    >
                      <Ionicons
                        name="open-outline"
                        size={14}
                        color={colors.textDark}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.detailBtnText}>Listing</Text>
                    </TouchableOpacity>
                  )}

                  {app.status === 'saved' && (
                    <TouchableOpacity
                      style={styles.markAppliedBtn}
                      onPress={() => handleQuickMarkApplied(app.id)}
                      disabled={isUpdatingThis}
                    >
                      {isUpdatingThis ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={colors.white}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.markAppliedBtnText}>
                            Mark Applied
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark },
  countBadge: {
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: colors.tealDark },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.red || '#EF4444',
    marginTop: 10,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  listContainer: { marginTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: { flex: 1, marginRight: 10 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  companyName: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  notesBox: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  notesText: { fontSize: 12, color: colors.textDark, fontStyle: 'italic' },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  letterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  letterBtnText: { fontSize: 12, fontWeight: '600', color: colors.tealDark },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailBtnText: { fontSize: 12, fontWeight: '600', color: colors.textDark },
  markAppliedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  markAppliedBtnText: { fontSize: 12, fontWeight: '600', color: colors.white },
});
