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
import colors from '../theme/colors';
import Chip from '../components/Chip';
import { getInternshipDetail, ApiError } from '../services/api';

export default function InternshipDetailScreen({ route, navigation }) {
  const internshipId =
    route?.params?.internshipId ||
    route?.params?.internship?.id ||
    route?.params?.id;

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!internshipId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await getInternshipDetail(internshipId);
      setInternship(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to load internship details.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [internshipId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formatWorkType = (workType) => {
    if (!workType) return '';
    return workType.charAt(0).toUpperCase() + workType.slice(1).toLowerCase();
  };

  const formatDate = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading internship details...</Text>
        </View>
      )}

      {/* 404 Not Found State */}
      {!loading && isNotFound && (
        <View style={styles.statusCard}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={styles.statusTitle}>Listing Not Found</Text>
          <Text style={styles.statusSubtitle}>
            This internship listing may have expired or been removed from the catalog.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Back to Internships</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Network / API Error State */}
      {!loading && !isNotFound && error && (
        <View style={styles.statusCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red || '#EF4444'} />
          <Text style={styles.statusTitle}>Error Loading Listing</Text>
          <Text style={styles.statusSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={fetchDetail}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Populated Listing */}
      {!loading && !isNotFound && !error && internship && (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.meta}>
              {internship.company} · {internship.location}
            </Text>
            {internship.work_type ? (
              <View style={styles.workTypeBadge}>
                <Text style={styles.workTypeText}>{formatWorkType(internship.work_type)}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{internship.title}</Text>

          {internship.posted_at ? (
            <Text style={styles.postedDate}>
              Posted on {formatDate(internship.posted_at)}
            </Text>
          ) : null}

          {/* Description Section */}
          <Text style={styles.sectionTitle}>About the Role</Text>
          <Text style={styles.description}>{internship.description}</Text>

          {/* Required Skills */}
          {internship.required_skills && internship.required_skills.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Required Skills</Text>
              <View style={styles.chipRow}>
                {internship.required_skills.map((skill) => (
                  <Chip key={skill} label={skill} variant="skill" />
                ))}
              </View>
            </>
          )}

          {/* Preferred Skills */}
          {internship.preferred_skills && internship.preferred_skills.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Preferred Skills</Text>
              <View style={styles.chipRow}>
                {internship.preferred_skills.map((skill) => (
                  <Chip key={skill} label={skill} variant="neutral" />
                ))}
              </View>
            </>
          )}

          {/* Languages & Education */}
          {(internship.languages?.length > 0 || internship.min_education) && (
            <>
              <Text style={styles.sectionTitle}>Requirements & Background</Text>
              <View style={styles.detailsBox}>
                {internship.languages && internship.languages.length > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="language-outline" size={18} color={colors.teal} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Working Languages</Text>
                      <Text style={styles.detailValue}>{internship.languages.join(', ')}</Text>
                    </View>
                  </View>
                )}

                {internship.min_education && (
                  <View style={[styles.detailItem, internship.languages?.length > 0 && { marginTop: 12 }]}>
                    <Ionicons name="school-outline" size={18} color={colors.teal} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Education Level</Text>
                      <Text style={styles.detailValue}>{internship.min_education}</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, color: colors.textMuted, flex: 1, marginRight: 8 },
  workTypeBadge: {
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workTypeText: { fontSize: 12, fontWeight: '600', color: colors.tealDark },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  postedDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 24, marginBottom: 10 },
  description: { fontSize: 14, color: colors.textDark, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  detailsBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start' },
  detailIcon: { marginRight: 10, marginTop: 2 },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  detailValue: { fontSize: 14, color: colors.textDark, fontWeight: '600', marginTop: 2 },
  centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  statusSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
});
