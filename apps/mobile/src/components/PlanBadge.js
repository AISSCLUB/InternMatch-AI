import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function PlanBadge({ plan = 'free', style }) {
  const isFree = plan.toLowerCase() === 'free';
  const label = isFree ? 'FREE PLAN' : plan.toUpperCase();

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: spacing.radii.pill,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(14, 116, 144, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  badgeText: {
    ...typography.badge,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.accentStrong || colors.tealDark,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
