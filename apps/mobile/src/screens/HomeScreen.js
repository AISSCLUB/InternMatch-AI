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
        <Text style={styles.brand}>InternMatch</Text>
        <Ionicons name="locate" size={20} color={colors.teal} style={{ marginLeft: 4 }} />
      </View>
      <Text style={styles.hello}>Hello, {displayName} 👋</Text>

      {!hasAnalyzedCV ? (
        <>
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="arrow-up" size={22} color={colors.teal} />
            </View>
            <Text style={styles.uploadTitle}>Upload your CV and let the matches begin.</Text>
            <Text style={styles.uploadSubtitle}>
              Drag and drop or select a PDF — AI analyzes your skills and matches you with internships.
            </Text>
            <GradientButton
              title="Upload CV"
              color={colors.teal}
              onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}
              style={{ marginTop: 16 }}
            />
          </View>

          <Text style={styles.sectionTitle}>Recommendations for You</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>You can browse even without a CV.</Text>
            <Text style={styles.infoSubtitle}>
              Discover open internships across companies. Once you upload your CV, personalized compatibility fit scores will be calculated automatically.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Internships' })}
            >
              <Text style={styles.browseButtonText}>Explore Internship Catalog</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.tealDark} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* CV Analyzed Status Card */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>CV STATUS</Text>
            <Text style={styles.statusTitle}>Your profile has been analyzed.</Text>
            <View style={styles.statusFileRow}>
              <Text style={styles.statusFileName}>CV Document</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CVUpload', { origin: 'Home' })}>
                <Text style={styles.reloadLink}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Matchups Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TODAY'S MATCHUPS</Text>
            {matches.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}>
                <Text style={styles.seeAllLink}>See all ({matches.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Calculating State */}
          {isCalculating && (
            <View style={styles.calculatingCard}>
              <ActivityIndicator size="small" color={colors.teal} />
              <Text style={styles.calculatingTitle}>Finding Your Matches...</Text>
              <Text style={styles.calculatingSubtitle}>Evaluating skills fit and semantic profile match ({progressPercent}%)</Text>
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
              <TouchableOpacity style={styles.retryBtn} onPress={handleStartCalculation}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Matches */}
          {matchesLoading && !isCalculating && (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={colors.teal} />
              <Text style={styles.loadingText}>Loading top matches...</Text>
            </View>
          )}

          {/* Matches Error */}
          {matchesError && !matchesLoading && !isCalculating && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.red || '#EF4444'} />
              <Text style={styles.errorText}>{matchesError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMatchesData}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty Matches State */}
          {!matchesLoading && !isCalculating && !matchesError && matches.length === 0 && (
            <View style={styles.emptyMatchesCard}>
              <Ionicons name="sparkles-outline" size={36} color={colors.teal} />
              <Text style={styles.emptyMatchesTitle}>No Calculated Matches Yet</Text>
              <Text style={styles.emptyMatchesSubtitle}>
                Run our AI matching algorithm to calculate your personalized fit scores against available internships.
              </Text>
              <GradientButton
                title="Find My Matches"
                color={colors.teal}
                onPress={handleStartCalculation}
                style={{ marginTop: 16, width: '100%' }}
              />
            </View>
          )}

          {/* Populated Top Matches */}
          {!matchesLoading && !isCalculating && topMatches.length > 0 && (
            <>
              {/* Highlight First Match */}
              {firstMatch && (
                <TouchableOpacity
                  style={styles.highlightCard}
                  onPress={() => navigation.navigate('InternshipDetail', { internshipId: firstMatch.internship.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.highlightTop}>
                    <Ionicons name="flame" size={16} color="#F2812B" />
                    <Text style={styles.highlightTitle}>{firstMatch.internship.title}</Text>
                    <MatchBadge score={firstMatch.overall_score} />
                  </View>
                  <Text style={styles.highlightMeta}>
                    {firstMatch.internship.company} · {firstMatch.internship.location}
                  </Text>
                  <TouchableOpacity
                    style={styles.whyLinkWrap}
                    onPress={() => navigation.navigate('WhyYouMatch', { matchId: firstMatch.match_id })}
                  >
                    <Text style={styles.whyLink}>Why You Match</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primaryBlue} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {/* Remaining Top Matches */}
              {remainingMatches.map((item, index) => (
                <TouchableOpacity
                  key={item.match_id}
                  style={[
                    styles.plainRow,
                    index === remainingMatches.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => navigation.navigate('InternshipDetail', { internshipId: item.internship.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.plainRowMain}>
                    <Text style={styles.plainTitle}>{item.internship.title}</Text>
                    <Text style={styles.plainMeta}>
                      {item.internship.company} · {item.internship.location}
                    </Text>
                  </View>
                  <MatchBadge score={item.overall_score} />
                </TouchableOpacity>
              ))}

              {matches.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllMatchupsBtn}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Matchups' })}
                >
                  <Text style={styles.viewAllMatchupsText}>View all {matches.length} matches</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.tealDark} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '700', color: colors.tealDark },
  hello: { fontSize: 24, fontWeight: '700', color: colors.textDark, marginTop: 12, marginBottom: 20 },
  uploadCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  uploadSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  seeAllLink: { fontSize: 13, color: colors.tealDark, fontWeight: '600' },
  infoCard: { backgroundColor: colors.white, borderRadius: 16, padding: 18, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  infoSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 18 },
  browseButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  browseButtonText: { fontSize: 13, color: colors.tealDark, fontWeight: '600' },
  statusCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 4 },
  statusFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusFileName: { fontSize: 13, color: colors.textDark, fontWeight: '600' },
  reloadLink: { fontSize: 13, color: colors.primaryBlue, fontWeight: '600' },
  centerLoading: { alignItems: 'center', paddingVertical: 24 },
  loadingText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  calculatingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  calculatingTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  calculatingSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: 6, backgroundColor: colors.teal },
  cancelCalcBtn: { marginTop: 10, paddingVertical: 4 },
  cancelCalcText: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: { fontSize: 13, color: colors.red || '#EF4444', textAlign: 'center', marginTop: 4 },
  retryBtn: { marginTop: 10, backgroundColor: colors.teal, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  retryBtnText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  emptyMatchesCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  emptyMatchesTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginTop: 10 },
  emptyMatchesSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  highlightCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  highlightTop: { flexDirection: 'row', alignItems: 'center' },
  highlightTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textDark, marginLeft: 6, marginRight: 8 },
  highlightMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  whyLinkWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  whyLink: { fontSize: 12, color: colors.primaryBlue, fontWeight: '600', textDecorationLine: 'underline' },
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
  viewAllMatchupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: '#E6F4F6',
    borderRadius: 10,
  },
  viewAllMatchupsText: { fontSize: 13, color: colors.tealDark, fontWeight: '600' },
});
