import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BackButton from './BackButton';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  navigation,
  onBackPress,
  rightAction,
  style,
  titleStyle,
}) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftSlot}>
        {showBack ? (
          <BackButton navigation={navigation} onPress={onBackPress} />
        ) : null}
      </View>

      <View style={styles.centerSlot}>
        {title ? (
          <Text
            style={[styles.title, titleStyle]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {rightAction || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.headerContentHeight,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'transparent',
  },
  leftSlot: {
    width: spacing.minimumTouchTarget,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  rightSlot: {
    width: spacing.minimumTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary || colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
