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
  alignment = 'center', // 'center' | 'start'
  style,
  titleStyle,
  bordered = false,
}) {
  const isStart = alignment === 'start';

  return (
    <View
      style={[
        styles.header,
        bordered && styles.bordered,
        style,
      ]}
    >
      {/* Left Slot: Back button or empty spacer */}
      {showBack ? (
        <View style={styles.leftSlot}>
          <BackButton navigation={navigation} onPress={onBackPress} />
        </View>
      ) : isStart ? null : (
        <View style={styles.leftSlot} />
      )}

      {/* Center/Title Slot */}
      <View
        style={[
          styles.titleContainer,
          isStart && styles.titleContainerStart,
          !showBack && isStart && styles.titleContainerStartNoBack,
        ]}
      >
        {title ? (
          <Text
            style={[
              styles.title,
              isStart && styles.titleStart,
              titleStyle,
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              isStart && styles.subtitleStart,
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Slot: Custom action or balancing spacer */}
      {rightAction ? (
        <View style={styles.rightSlot}>{rightAction}</View>
      ) : isStart ? null : (
        <View style={styles.rightSlotSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.headerContentHeight,
    paddingHorizontal: spacing.screenHorizontalPadding,
    backgroundColor: colors.background || colors.screenBg,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass?.borderHairline || colors.borderSubtle || colors.border,
  },
  leftSlot: {
    minWidth: spacing.minimumTouchTarget,
    minHeight: spacing.minimumTouchTarget,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginEnd: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  titleContainerStart: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  titleContainerStartNoBack: {
    paddingStart: 0,
  },
  rightSlot: {
    minWidth: spacing.minimumTouchTarget,
    minHeight: spacing.minimumTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginStart: spacing.xs,
  },
  rightSlotSpacer: {
    width: spacing.minimumTouchTarget,
    height: spacing.minimumTouchTarget,
    marginStart: spacing.xs,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary || colors.textDark,
    textAlign: 'center',
  },
  titleStart: {
    textAlign: 'left',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  subtitleStart: {
    textAlign: 'left',
  },
});
