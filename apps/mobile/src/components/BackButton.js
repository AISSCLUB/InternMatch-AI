import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import motionTokens from '../motion/motionTokens';
import PressableScale from './PressableScale';

export default function BackButton({
  navigation,
  onPress,
  color = colors.textPrimary || colors.textDark,
  style,
  accessibilityLabel = 'Go back',
  accessibilityHint = 'Navigates to the previous screen',
}) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  return (
    <PressableScale
      style={[styles.button, style]}
      onPress={handlePress}
      scaleTo={motionTokens.scales.iconPressed}
      activeOpacity={0.7}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={22} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: spacing.minimumTouchTarget,
    height: spacing.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
