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
import { useScrollToTop } from '@react-navigation/native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import AppChromeHeader from '../components/AppChromeHeader';
import Card from '../components/Card';
import PressableCard from '../components/PressableCard';
import Chip from '../components/Chip';
import PressableScale from '../components/PressableScale';
import BookmarkButton from '../components/BookmarkButton';
import { getInternships } from '../services/api';
import haptics from '../services/haptics';
import { useTabScroll, useTabScrollReporter } from '../context/TabScrollContext';
import { useSavedInternships } from '../context/SavedInternshipsContext';

const PAGE_SIZE = 20;

const WORK_TYPE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Onsite', value: 'onsite' },
];

export default function InternshipsScreen({ navigation }) {
  const scrollViewRef = useRef(null);
  useTabScroll('Internships', scrollViewRef);
  useScrollToTop(scrollViewRef);
  const onScroll = useTabScrollReporter(20);

  const { isSaved, toggleSave, isMutating, savedIds } = useSavedInternships();

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

  const handleFilterSelect = (label) => {
    if (selectedFilter !== label) {
      haptics.selection();
      setSelectedFilter(label);
    }
  };

  const formatWorkType = (wt) => {
    if (!wt) return null;
    return wt.charAt(0).toUpperCase() + wt.slice(1);
  };

  const hasMore = items.length < total;

  const savedHeaderAction = (
    <PressableScale
      onPress={() => navigation.navigate('SavedInternships')}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={"Saved internships, " + savedIds.size + " saved"}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View>
        <Ionicons
          name={savedIds.size > 0 ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={colors.accentStrong}
        />
        {savedIds.size > 0 ? (
          <View style={styles.savedCountBadge}>
            <Text style={styles.savedCountText}>{savedIds.size}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );

  return (
    <ScreenContainer edges={['top']}>
      <AppChromeHeader />
      <ScreenHeader
        title="Internships"
        rightAction={savedHeaderAction}
        alignment="start"
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
        {/* Work Type Filter Chips */}
        <View style={styles.filterRow}>
          {WORK_TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterChip,
                selectedFilter === f.label && styles.filterChipActive,
              ]}
              onPress={() => handleFilterSelect(f.label)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f.label}`}
              accessibilityState={{ selected: selectedFilter === f.label }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === f.label && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Initial Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            <Text style={styles.loadingText}>Loading internships...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger || '#EF4444'} />
            <Text style={styles.errorTitle}>Could Not Load Internships</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchInitialInternships(selectedFilter)}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <Card style={styles.emptyCard} padding="lg">
            <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary || colors.textMuted} />
            <Text style={styles.emptyTitle}>No Internships Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter !== 'All'
                ? `There are currently no ${selectedFilter.toLowerCase()} internships available.`
                : 'The internship catalog is currently empty. Check back soon!'}
            </Text>
            {selectedFilter !== 'All' && (
              <TouchableOpacity
                style={styles.resetFilterButton}
                onPress={() => setSelectedFilter('All')}
                accessibilityRole="button"
                accessibilityLabel="Show All Internships"
              >
                <Text style={styles.resetFilterText}>Show All Internships</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Populated Listing */}
        {!loading && !error && items.length > 0 && (
          <>
            {items.map((item) => (
              <PressableCard
                key={item.id}
                style={styles.card}
                padding="md"
                onPress={() =>
                  navigation.navigate('InternshipDetail', { internshipId: item.id })
                }
                accessibilityLabel={`${item.title} at ${item.company}`}
              >
                <View style={styles.cardTop}>
                  <BookmarkButton
                    isSaved={isSaved(item.id)}
                    disabled={isMutating(item.id)}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      toggleSave(item);
                    }}
                    style={styles.cardBookmark}
                  />
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.work_type ? (
                    <View style={styles.workTypeBadge}>
                      <Text style={styles.workTypeText}>{formatWorkType(item.work_type)}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.cardMeta}>
                  {item.company} - {item.location}
                </Text>

                {item.required_skills && item.required_skills.length > 0 && (
                  <View style={styles.skillsRow}>
                    {item.required_skills.slice(0, 3).map((skill) => (
                      <Chip key={skill} label={skill} variant="skill" />
                    ))}
                    {item.required_skills.length > 3 && (
                      <Text style={styles.moreSkillsText}>
                        +{item.required_skills.length - 3} more
                      </Text>
                    )}
                  </View>
                )}
              </PressableCard>
            ))}

            {/* Pagination Controls */}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel={`Load more (${items.length} of ${total})`}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.textInverse || colors.white} />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load More ({items.length} of {total})
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {!hasMore && total > 0 && (
              <Text style={styles.exhaustedText}>Showing all {total} internships</Text>
            )}
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
    paddingBottom: 104,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.pill,
    backgroundColor: colors.surfaceSubtle || '#DCE9EC',
    marginEnd: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent || colors.teal,
    borderColor: colors.accent || colors.teal,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary || colors.textMuted,
  },
  filterTextActive: {
    color: colors.textInverse || colors.white,
    fontWeight: '700',
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
  card: {
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    marginEnd: spacing.sm,
  },
  workTypeBadge: {
    backgroundColor: colors.accentSoft || '#E6F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: spacing.radii.sm,
  },
  workTypeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  moreSkillsText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    marginStart: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.danger || '#EF4444',
    marginTop: spacing.sm,
  },
  errorMessage: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent || colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radii.sm,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
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
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  resetFilterButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radii.sm,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  resetFilterText: {
    ...typography.button,
    color: colors.accentStrong || colors.tealDark,
    fontSize: 13,
  },
  loadMoreButton: {
    backgroundColor: colors.accent || colors.teal,
    borderRadius: spacing.radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  loadMoreText: {
    ...typography.button,
    color: colors.textInverse || colors.white,
    fontSize: 14,
  },
  exhaustedText: {
    textAlign: 'center',
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  savedCountBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  cardBookmark: {
    marginStart: spacing.xs,
    marginTop: -spacing.xs,
  },
});
