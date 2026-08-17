import React from 'react';
import { Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import motionTokens from '../motion/motionTokens';
import PressableScale from './PressableScale';

/**
 * Solid-color primary CTA button with tactile physics and light haptic feedback.
 */
export default function GradientButton({
  title,
  onPress,
  color = colors.primaryBlue,
  textColor = colors.white,
  style,
  outline = false,
  disabled = false,
  accessibilityLabel,
}) {
  if (outline) {
    return (
      <PressableScale
        style={[
          styles.button,
          styles.outline,
          { borderColor: color },
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        scaleTo={motionTokens.scales.buttonPressed}
        activeOpacity={motionTokens.opacities.pressed}
        haptic={disabled ? 'none' : 'light'}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      >
        <Text style={[styles.text, { color }]}>{title}</Text>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      style={[
        styles.button,
        { backgroundColor: color },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      scaleTo={motionTokens.scales.buttonPressed}
      activeOpacity={motionTokens.opacities.pressed}
      haptic={disabled ? 'none' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: spacing.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: spacing.minimumTouchTarget,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.button,
  },
});
