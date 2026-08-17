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
import Svg, { Circle } from 'react-native-svg';
import colors from '../theme/colors';
import Chip from '../components/Chip';
import { getMatchExplanation, ApiError } from '../services/api';

function ScoreRing({ score, size = 140, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.max(0, Math.min(100, typeof score === 'number' ? score : 0));
  const progress = circumference - (validScore / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E1EEF0" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.tealDark}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={styles.scoreText}>%{validScore}</Text>
    </View>
  );
}

export default function WhyYouMatchScreen({ route, navigation }) {
  const matchId = route?.params?.matchId;

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>Why You Match</Text>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Generating AI Match Breakdown...</Text>
          <Text style={styles.loadingSubtext}>Analyzing requirements against your verified background</Text>
        </View>
      )}

      {/* 404 Not Found */}
      {!loading && isNotFound && (
        <View style={styles.card}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.cardTitle}>Match Record Not Found</Text>
          <Text style={styles.cardSubtitle}>
            This match explanation could not be found. Please recalculate matches from the Matchups tab.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Back to Matchups</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error State */}
      {!loading && !isNotFound && error && (
        <View style={styles.card}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red || '#EF4444'} />
          <Text style={styles.cardTitle}>Could Not Load Explanation</Text>
          <Text style={styles.cardSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={fetchExplanationData}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Populated Explanation */}
      {!loading && !isNotFound && !error && explanation && (
        <>
          {/* Compatibility Ring */}
          <View style={styles.ringWrap}>
            <ScoreRing score={explanation.overall_score} />
            <Text style={styles.scoreLabel}>Overall Compatibility Fit</Text>
          </View>

          {/* AI Narrative Breakdown */}
          {explanation.why_you_match ? (
            <View style={styles.narrativeCard}>
              <View style={styles.narrativeHeader}>
                <Ionicons name="sparkles" size={16} color={colors.tealDark} style={{ marginRight: 6 }} />
                <Text style={styles.narrativeTitle}>AI Fit Assessment</Text>
              </View>
              <Text style={styles.narrativeBody}>{explanation.why_you_match}</Text>
            </View>
          ) : null}

          {/* Matching Skills */}
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

          {/* Missing Skills / Skill Gap */}
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
          {explanation.skill_gap_analysis && (
            <View style={styles.recommendationsBox}>
              <View style={styles.recHeaderRow}>
                <Ionicons name="bulb-outline" size={18} color={colors.orange || '#F59E0B'} style={{ marginRight: 6 }} />
                <Text style={styles.recBoxTitle}>Skill Gap Analysis & Next Steps</Text>
              </View>

              {explanation.skill_gap_analysis.summary ? (
                <Text style={styles.recSummaryText}>{explanation.skill_gap_analysis.summary}</Text>
              ) : null}

              {explanation.skill_gap_analysis.recommendations &&
                explanation.skill_gap_analysis.recommendations.length > 0 && (
                  <View style={styles.recommendationsList}>
                    {explanation.skill_gap_analysis.recommendations.map((rec, idx) => (
                      <View key={idx} style={styles.recItemRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.teal} style={styles.recIcon} />
                        <Text style={styles.recItemText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
            </View>
          )}

          {/* Application Workflow Banner (Gate 2.37B boundary) */}
          <View style={styles.applicationNoticeCard}>
            <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
            <Text style={styles.applicationNoticeText}>
              Personalized application & cover letter generation will be available in the Application Tracker.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 10 },
  centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  loadingText: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 16 },
  loadingSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  primaryButton: {
    marginTop: 18,
    backgroundColor: colors.teal,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  ringWrap: { alignItems: 'center', marginVertical: 16 },
  scoreText: { position: 'absolute', fontSize: 26, fontWeight: '700', color: colors.tealDark },
  scoreLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 8 },
  narrativeCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  narrativeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  narrativeTitle: { fontSize: 14, fontWeight: '700', color: colors.tealDark },
  narrativeBody: { fontSize: 13, color: colors.textDark, lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: 16, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  emptySkillsNotice: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 10 },
  recommendationsBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recBoxTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  recSummaryText: { fontSize: 13, color: '#78350F', lineHeight: 18, marginBottom: 10 },
  recommendationsList: { marginTop: 4 },
  recItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  recIcon: { marginRight: 8, marginTop: 2 },
  recItemText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },
  applicationNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicationNoticeText: { flex: 1, fontSize: 12, color: colors.textMuted, marginLeft: 10, lineHeight: 16 },
});
