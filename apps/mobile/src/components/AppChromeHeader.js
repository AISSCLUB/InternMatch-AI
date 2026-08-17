import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import InternMatchLogo from './InternMatchLogo';
import PlanBadge from './PlanBadge';

export default function AppChromeHeader({ style }) {
  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.contentRow}>
        <InternMatchLogo style={styles.logoItem} />
        <PlanBadge plan="free" style={styles.badgeItem} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 92,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontalPadding,
    backgroundColor: colors.surface || '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle || '#E2E8F0',
  },
  contentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoItem: {
    alignSelf: 'center',
  },
  badgeItem: {
    alignSelf: 'center',
  },
});
