import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import motionTokens from '../../motion/motionTokens';
import useReducedMotion from '../../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnimatedScoreRing({
  score = 0,
  size = 140,
  strokeWidth = 12,
  trackColor = '#E1EEF0',
  progressColor = colors.accentStrong || colors.tealDark,
  style,
}) {
  const isReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.max(0, Math.min(100, typeof score === 'number' ? score : 0));
  const targetOffset = circumference - (validScore / 100) * circumference;

  const progressOffset = useSharedValue(isReducedMotion ? targetOffset : circumference);

  useEffect(() => {
    if (isReducedMotion) {
      progressOffset.value = targetOffset;
      return;
    }

    progressOffset.value = withTiming(targetOffset, {
      duration: motionTokens.durations.scoreRing,
      easing: Easing.out(Easing.cubic),
    });
  }, [circumference, isReducedMotion, progressOffset, targetOffset, validScore]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: progressOffset.value,
    };
  });

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: validScore }}
      accessibilityLabel={`Compatibility Score ${validScore} percent`}
    >
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress Ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.textContainer} accessible={false}>
        <Text style={styles.scoreText}>{validScore}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.display,
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary || colors.textDark,
  },
});
