import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function PlanBadge({ plan = 'free', style }) {
  const { t } = useTranslation();
  const isFree = !plan || plan.toLowerCase() === 'free';
  const label = isFree
    ? t('components.planBadgeFree', { defaultValue: 'Free Plan' })
    : t('components.planBadgePlan', { plan: plan.toUpperCase(), defaultValue: `${plan.toUpperCase()} Plan` });

  return (
    <View style={[styles.badge, style]}>
      <Text
        style={styles.badgeText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: 130,
    paddingHorizontal: spacing.sm,
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
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.accentStrong || colors.tealDark,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
