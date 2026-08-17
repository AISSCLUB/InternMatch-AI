import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import Chip from '../components/Chip';
import { getInternships } from '../services/api';

const PAGE_SIZE = 20;

const WORK_TYPE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Onsite', value: 'onsite' },
];

export default function InternshipsScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const activeFilterRef = useRef(selectedFilter);
  activeFilterRef.current = selectedFilter;

  const getFilterValue = (filterLabel) => {
    const found = WORK_TYPE_FILTERS.find((f) => f.label === filterLabel);
    return found ? found.value : undefined;
  };

  const fetchInitialInternships = useCallback(async (filterLabel = selectedFilter) => {
    setLoading(true);
    setError(null);

    const workType = getFilterValue(filterLabel);

    try {
      const response = await getInternships({
        work_type: workType,
        limit: PAGE_SIZE,
        offset: 0,
      });

      if (activeFilterRef.current === filterLabel) {
        setItems(response.items || []);
        setTotal(response.total || 0);
      }
    } catch (err) {
      if (activeFilterRef.current === filterLabel) {
        const msg = err instanceof Error ? err.message : 'Failed to load internships.';
        setError(msg);
      }
    } finally {
      if (activeFilterRef.current === filterLabel) {
        setLoading(false);
      }
    }
  }, [selectedFilter]);

  useEffect(() => {
    setRefreshing(false);
    setLoadingMore(false);
    fetchInitialInternships(selectedFilter);
  }, [selectedFilter, fetchInitialInternships]);

  const handleRefresh = async () => {
    const filterLabel = selectedFilter;
    setRefreshing(true);
    setError(null);
    const workType = getFilterValue(filterLabel);

    try {
      const response = await getInternships({
        work_type: workType,
        limit: PAGE_SIZE,
        offset: 0,
      });

      if (activeFilterRef.current === filterLabel) {
        setItems(response.items || []);
        setTotal(response.total || 0);
      }
    } catch (err) {
      if (activeFilterRef.current === filterLabel) {
        const msg = err instanceof Error ? err.message : 'Failed to refresh internships.';
        setError(msg);
      }
    } finally {
      if (activeFilterRef.current === filterLabel) {
        setRefreshing(false);
      }
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || loading || items.length >= total) {
      return;
    }

    const filterLabel = selectedFilter;
    setLoadingMore(true);
    const workType = getFilterValue(filterLabel);

    try {
      const response = await getInternships({
        work_type: workType,
        limit: PAGE_SIZE,
        offset: items.length,
      });

      if (activeFilterRef.current === filterLabel) {
        setItems((prevItems) => {
          const seenIds = new Set(prevItems.map((i) => i.id));
          const newUniqueItems = (response.items || []).filter((i) => !seenIds.has(i.id));
          return [...prevItems, ...newUniqueItems];
        });
        setTotal(response.total || 0);
      }
    } catch (err) {
      if (activeFilterRef.current === filterLabel) {
        console.warn('Load more error:', err);
      }
    } finally {
      if (activeFilterRef.current === filterLabel) {
        setLoadingMore(false);
      }
    }
  };

  const formatWorkType = (workType) => {
    if (!workType) return '';
    return workType.charAt(0).toUpperCase() + workType.slice(1).toLowerCase();
  };

  const hasMore = items.length < total;

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
      <Text style={styles.title}>Internships</Text>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {WORK_TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, selectedFilter === f.label && styles.filterChipActive]}
            onPress={() => setSelectedFilter(f.label)}
          >
            <Text style={[styles.filterText, selectedFilter === f.label && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Initial Loading State */}
      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading internships...</Text>
        </View>
      )}

      {/* Error State */}
      {!loading && error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.red || '#EF4444'} />
          <Text style={styles.errorTitle}>Could Not Load Internships</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchInitialInternships(selectedFilter)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Internships Found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedFilter !== 'All'
              ? `There are currently no ${selectedFilter.toLowerCase()} internships available.`
              : 'The internship catalog is currently empty. Check back soon!'}
          </Text>
          {selectedFilter !== 'All' && (
            <TouchableOpacity style={styles.resetFilterButton} onPress={() => setSelectedFilter('All')}>
              <Text style={styles.resetFilterText}>Show All Internships</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Populated Listing */}
      {!loading && !error && items.length > 0 && (
        <>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigation.navigate('InternshipDetail', { internshipId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.work_type ? (
                  <View style={styles.workTypeBadge}>
                    <Text style={styles.workTypeText}>{formatWorkType(item.work_type)}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.cardMeta}>
                {item.company} · {item.location}
              </Text>

              {item.required_skills && item.required_skills.length > 0 && (
                <View style={styles.skillsRow}>
                  {item.required_skills.slice(0, 3).map((skill) => (
                    <Chip key={skill} label={skill} variant="skill" />
                  ))}
                  {item.required_skills.length > 3 && (
                    <Text style={styles.moreSkillsText}>+{item.required_skills.length - 3} more</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Pagination Controls */}
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.loadMoreText}>Load More ({items.length} of {total})</Text>
              )}
            </TouchableOpacity>
          )}

          {!hasMore && total > 0 && (
            <Text style={styles.exhaustedText}>Showing all {total} internships</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#DCE9EC',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: colors.white },
  centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  card: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontWeight: '700', fontSize: 15, color: colors.textDark, marginRight: 8 },
  workTypeBadge: {
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workTypeText: { fontSize: 11, fontWeight: '600', color: colors.tealDark },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
  moreSkillsText: { fontSize: 11, color: colors.textMuted, marginLeft: 4, marginBottom: 8 },
  errorCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  errorMessage: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  retryButton: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  resetFilterButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E6F4F6',
  },
  resetFilterText: { color: colors.tealDark, fontWeight: '600', fontSize: 13 },
  loadMoreButton: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loadMoreText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  exhaustedText: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 16 },
});
