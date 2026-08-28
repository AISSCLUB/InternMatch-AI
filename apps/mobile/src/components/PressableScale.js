import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import motionTokens from '../motion/motionTokens';
import useReducedMotion from '../hooks/useReducedMotion';
import haptics from '../services/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({
  children,
  onPress,
  disabled = false,
  scaleTo = motionTokens.scales.buttonPressed,
  activeOpacity = motionTokens.opacities.pressed,
  haptic = 'none', // 'light' | 'selection' | 'medium' | 'none'
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  hitSlop,
  ...rest
}) {
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = (event) => {
    if (disabled) return;

    if (!isReducedMotion) {
      scale.value = withSpring(scaleTo, motionTokens.spring.press);
    }
    if (activeOpacity < 1) {
      opacity.value = withSpring(activeOpacity, motionTokens.spring.press);
    }

    if (haptic === 'light') {
      haptics.lightImpact();
    } else if (haptic === 'selection') {
      haptics.selection();
    } else if (haptic === 'medium') {
      haptics.mediumImpact();
    }
  };

  const handlePressOut = (event) => {
    if (disabled) return;

    if (!isReducedMotion) {
      scale.value = withSpring(1, motionTokens.spring.press);
    }
    opacity.value = withSpring(1, motionTokens.spring.press);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={hitSlop}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
