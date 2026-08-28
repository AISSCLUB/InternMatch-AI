import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import motionTokens from '../../motion/motionTokens';
import useReducedMotion from '../../hooks/useReducedMotion';

export default function Reveal({
  children,
  delay = 0,
  duration = motionTokens.durations.reveal,
  distance = 8,
  style,
  ...rest
}) {
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(isReducedMotion ? 1 : 0);
  const translateY = useSharedValue(isReducedMotion ? 0 : distance);

  useEffect(() => {
    if (isReducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration })
    );

    translateY.value = withDelay(
      delay,
      withSpring(0, motionTokens.spring.reveal)
    );
  }, [delay, distance, duration, isReducedMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isReducedMotion) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}
