import React from 'react';
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
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import PressableCard from '../components/PressableCard';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import BookmarkButton from '../components/BookmarkButton';
import { useSavedInternships } from '../context/SavedInternshipsContext';

export default function SavedInternshipsScreen({ navigation }) {
  const {
    savedItems,
    loading,
    refreshing,
    error,
    total,
    refreshSavedInternships,
    toggleSave,
    isMutating,
  } = useSavedInternships();

  const handleRefresh = async () => {
    try {
      await refreshSavedInternships(false);
    } catch (_) {
      // Error handled in context
    }
  };

  const formatWorkType = (wt) => {
    if (!wt) return null;
    return wt.charAt(0).toUpperCase() + wt.slice(1);
  };

  const formatSavedDate = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return `Saved ${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } catch {
      return null;
    }
  };

  const hasItems = savedItems.length > 0;

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Saved Internships"
        subtitle={hasItems ? `${total} saved` : undefined}
        showBack={true}
        navigation={navigation}
        alignment="start"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* Loading State */}
        {loading && !hasItems && (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color={colors.accent}
            />
            <Text style={styles.loadingText}>Loading saved internships...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && !hasItems && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={colors.danger}
            />
            <Text style={styles.errorTitle}>Could Not Load Saved Internships</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refreshSavedInternships(true)}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && !hasItems && (
          <Card style={styles.emptyCard} padding="lg">
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="bookmark-outline"
                size={48}
                color={colors.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>No Saved Internships</Text>
            <Text style={styles.emptySubtitle}>
              Internships you bookmark from the catalog will appear here so you can
              easily review and track roles that interest you.
            </Text>
            <GradientButton
              title="Explore Internships"
              onPress={() => {
                navigation.navigate('MainTabs', { screen: 'Internships' });
              }}
              style={styles.exploreButton}
            />
          </Card>
        )}

        {/* Populated Listing */}
        {hasItems && (
          <>
            {savedItems.map((item) => {
              const internship = item.internship || {};
              const internshipId = item.internship_id || internship.id;
              const mutating = isMutating(internshipId);
              const savedDate = formatSavedDate(item.saved_at);

              return (
                <PressableCard
                  key={item.id || internshipId}
                  style={styles.card}
                  padding="md"
                  onPress={() =>
                    navigation.navigate('InternshipDetail', {
                      internshipId,
                    })
                  }
                  accessibilityLabel={`${internship.title || 'Internship'} at ${
                    internship.company || 'Company'
                  }`}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {internship.title || 'Internship Position'}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {internship.company || 'Company'} -{' '}
                        {internship.location || 'Location'}
                      </Text>
                    </View>
                    <BookmarkButton
                      isSaved={true}
                      disabled={mutating}
                      onPress={() => toggleSave(internship)}
                      style={styles.bookmarkBtn}
                    />
                  </View>

                  <View style={styles.tagsRow}>
                    {internship.work_type ? (
                      <View style={styles.workTypeBadge}>
                        <Text style={styles.workTypeText}>
                          {formatWorkType(internship.work_type)}
                        </Text>
                      </View>
                    ) : null}
                    {savedDate ? (
                      <Text style={styles.savedDateText}>{savedDate}</Text>
                    ) : null}
                  </View>

                  {internship.required_skills &&
                    internship.required_skills.length > 0 && (
                      <View style={styles.skillsRow}>
                        {internship.required_skills.slice(0, 3).map((skill) => (
                          <Chip key={skill} label={skill} variant="skill" />
                        ))}
                        {internship.required_skills.length > 3 && (
                          <View style={styles.moreSkillsBadge}>
                            <Text style={styles.moreSkillsText}>
                              +{internship.required_skills.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                </PressableCard>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.tabBarBottomPadding || 90,
  },
  centerContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
    borderRadius: spacing.radiusLg,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  exploreButton: {
    minWidth: 200,
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
    borderRadius: spacing.radiusLg,
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: spacing.radiusSm,
  },
  retryButtonText: {
    ...typography.buttonLabel,
    color: colors.textInverse,
  },
  card: {
    marginBottom: spacing.sm,
    borderRadius: spacing.radiusMd,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flex: 1,
    marginEnd: spacing.xs,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  cardMeta: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
  },
  bookmarkBtn: {
    marginStart: spacing.xs,
    marginTop: -spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  workTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.radiusXs,
    marginEnd: spacing.sm,
  },
  workTypeText: {
    ...typography.badgeLabel,
    color: colors.accentStrong,
  },
  savedDateText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  moreSkillsBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.radiusXs,
  },
  moreSkillsText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
  },
});
