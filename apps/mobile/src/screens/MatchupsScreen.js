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
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Matchups</Text>
        {hasAnalyzedCV && matches.length > 0 && !isCalculating && (
          <TouchableOpacity
            style={styles.recalculateHeaderBtn}
            onPress={handleRecalculate}
            disabled={isCalculating}
          >
            <Ionicons name="refresh" size={14} color={colors.tealDark} style={{ marginRight: 4 }} />
            <Text style={styles.recalculateHeaderText}>Recalculate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calculating Status Banner */}
      {isCalculating && (
        <View style={styles.calculatingCard}>
          <ActivityIndicator size="small" color={colors.teal} />
          <Text style={styles.calculatingTitle}>Recalculating Matchups...</Text>
          <Text style={styles.calculatingSubtitle}>
            Comparing your profile against all internship listings ({progressPercent}%)
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <TouchableOpacity style={styles.cancelCalcBtn} onPress={cancelCalculation}>
            <Text style={styles.cancelCalcText}>Stop Checking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Calculation Error */}
      {calculationError && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.red || '#EF4444'} />
          <Text style={styles.errorText}>{calculationError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRecalculate}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Initial Loading */}
      {loading && !refreshing && !isCalculating && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading your matchups...</Text>
        </View>
      )}

      {/* API / Network Error */}
      {!loading && error && !isCalculating && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.red || '#EF4444'} />
          <Text style={styles.errorTitle}>Could Not Load Matchups</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMatchesData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State: No CV Analyzed */}
      {!loading && !error && !isCalculating && !hasAnalyzedCV && (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={48} color={colors.teal} />
          <Text style={styles.emptyTitle}>CV Required for Matchups</Text>
          <Text style={styles.emptySubtitle}>
            Upload and analyze your CV so our AI matching engine can compute compatibility scores for you.
          </Text>
          <GradientButton
            title="Upload CV"
            color={colors.teal}
            onPress={() => navigation.navigate('CVUpload')}
            style={{ marginTop: 20, width: '100%' }}
          />
        </View>
      )}

      {/* Empty State: CV Analyzed but No Matches Calculated */}
      {!loading && !error && !isCalculating && hasAnalyzedCV && matches.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles-outline" size={48} color={colors.teal} />
          <Text style={styles.emptyTitle}>No Matches Calculated Yet</Text>
          <Text style={styles.emptySubtitle}>
            Ready to find your best matches? Run our matching calculation to score available internships against your verified skills and background.
          </Text>
          <GradientButton
            title="Calculate My Matches"
            color={colors.teal}
            onPress={handleRecalculate}
            style={{ marginTop: 20, width: '100%' }}
          />
        </View>
      )}

      {/* Populated Matchups List */}
      {!loading && !error && !isCalculating && top && (
        <>
          {/* Top Highlight Card */}
          <TouchableOpacity
            style={styles.highlightCard}
            onPress={() => navigation.navigate('InternshipDetail', { internshipId: top.internship.id })}
            activeOpacity={0.7}
          >
            <View style={styles.highlightTop}>
              <Ionicons name="flame" size={16} color="#F2812B" />
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

            <TouchableOpacity
              style={styles.whyLinkWrap}
              onPress={() =>
                navigation.navigate('WhyYouMatch', {
                  matchId: top.match_id,
                  internshipId: top.internship.id,
                })
              }
            >
              <Text style={styles.whyLink}>Why You Match</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primaryBlue} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Remaining Matches */}
          {rest.map((item, index) => (
            <TouchableOpacity
              key={item.match_id}
              style={[
                styles.plainRow,
                index === rest.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => navigation.navigate('InternshipDetail', { internshipId: item.internship.id })}
              activeOpacity={0.7}
            >
              <View style={styles.plainRowMain}>
                <Text style={styles.plainTitle}>{item.internship.title}</Text>
                <Text style={styles.plainMeta}>
                  {item.internship.company} · {item.internship.location}
                </Text>
                <TouchableOpacity
                  style={styles.plainWhyWrap}
                  onPress={() =>
                    navigation.navigate('WhyYouMatch', {
                      matchId: item.match_id,
                      internshipId: item.internship.id,
                    })
                  }
                >
                  <Text style={styles.plainWhyLink}>Why You Match</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.primaryBlue} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
              <MatchBadge score={item.overall_score} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark },
  recalculateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recalculateHeaderText: { fontSize: 12, fontWeight: '600', color: colors.tealDark },
  centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
  calculatingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  calculatingTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  calculatingSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: 6, backgroundColor: colors.teal },
  cancelCalcBtn: { marginTop: 10, paddingVertical: 4 },
  cancelCalcText: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  errorText: { fontSize: 13, color: colors.red || '#EF4444', textAlign: 'center', marginTop: 4 },
  retryBtn: { marginTop: 12, backgroundColor: colors.teal, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  highlightCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  highlightTop: { flexDirection: 'row', alignItems: 'center' },
  highlightLabel: { marginLeft: 6, color: '#D97706', fontWeight: '700', fontSize: 12 },
  highlightTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  highlightTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textDark, marginRight: 8 },
  highlightMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  scoresSubRow: { marginTop: 8 },
  scoresSubText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  whyLinkWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  whyLink: { color: colors.primaryBlue, fontWeight: '600', fontSize: 13, textDecorationLine: 'underline' },
  plainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  plainRowMain: { flex: 1, marginRight: 12 },
  plainTitle: { fontWeight: '600', fontSize: 14, color: colors.textDark },
  plainMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  plainWhyWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  plainWhyLink: { fontSize: 12, color: colors.primaryBlue, fontWeight: '600', textDecorationLine: 'underline' },
});
