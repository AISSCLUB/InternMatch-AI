import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import motionTokens from '../motion/motionTokens';
import useReducedMotion from '../hooks/useReducedMotion';
import haptics from '../services/haptics';
import PressableScale from '../components/PressableScale';
import {
  useTabScrollResetTrigger,
  useTabScrolledState,
} from '../context/TabScrollContext';

const ICONS = {
  Home: 'home',
  Internships: 'business',
  Matchups: 'radio-button-on',
  Applications: 'document-text',
  Profile: 'person-circle',
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const resetTabScroll = useTabScrollResetTrigger();
  const { isScrolled } = useTabScrolledState();
  const isReducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();

  const isLiquidSupported =
    Platform.OS === 'ios' &&
    ((typeof isLiquidGlassAvailable === 'function' && isLiquidGlassAvailable()) ||
      (typeof isGlassEffectAPIAvailable === 'function' && isGlassEffectAPIAvailable()));

  const bottomOffset = Math.max(insets.bottom, 12);
  const routeCount = state.routes.length || 5;

  // Exact geometry derived directly from windowWidth
  const totalBarWidth = windowWidth - 32; // left: 16, right: 16
  const tabWidth = totalBarWidth / routeCount;
  const lensWidth = Math.max(48, tabWidth - 8);
  const lensInset = (tabWidth - lensWidth) / 2; // Symmetric 4px inset

  // Exact initial target position for state.index
  const initialTargetX = tabWidth * state.index + lensInset;
  const translateX = useSharedValue(initialTargetX);

  useEffect(() => {
    const targetX = tabWidth * state.index + lensInset;

    if (isReducedMotion) {
      translateX.value = targetX;
      return;
    }

    translateX.value = withSpring(targetX, {
      damping: 26,
      stiffness: 300,
      mass: 0.7,
    });
  }, [state.index, tabWidth, lensInset, isReducedMotion, translateX]);

  const animatedLensStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.floatingBar, { bottom: bottomOffset }]}>
      {/* Dynamic Base Layer: Darker Teal Glass near Top -> Lighter Glass when Scrolled */}
      {isLiquidSupported ? (
        <>
          <GlassView
            style={StyleSheet.absoluteFillObject}
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={
              isScrolled
                ? 'rgba(14, 116, 144, 0.40)'
                : 'rgba(7, 43, 56, 0.75)'
            }
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isScrolled
                  ? 'rgba(15, 76, 92, 0.25)'
                  : 'rgba(7, 43, 56, 0.50)',
              },
            ]}
          />
        </>
      ) : Platform.OS === 'ios' ? (
        <>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            tint="systemUltraThinMaterialLight"
            intensity={85}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isScrolled
                  ? 'rgba(15, 76, 92, 0.32)'
                  : 'rgba(7, 43, 56, 0.60)',
              },
            ]}
          />
        </>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isScrolled
                ? 'rgba(15, 76, 92, 0.88)'
                : 'rgba(7, 43, 56, 0.94)',
            },
          ]}
        />
      )}

      {/* Tabs Container */}
      <View style={styles.tabsRow}>
        {/* ONE Moving Clear Liquid Glass Lens */}
        <Animated.View
          style={[
            styles.lensContainer,
            { width: lensWidth, height: 48, top: 6 },
            animatedLensStyle,
          ]}
          pointerEvents="none"
        >
          {isLiquidSupported ? (
            <>
              <GlassView
                style={StyleSheet.absoluteFillObject}
                glassEffectStyle="regular"
                colorScheme="light"
                tintColor="rgba(255, 255, 255, 0.75)"
              />
              <View style={[StyleSheet.absoluteFillObject, styles.liquidLensOverlay]} />
            </>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.fallbackLens]} />
          )}
        </Animated.View>

        {/* Interactive Tab Items */}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconName = ICONS[route.name] ?? 'ellipse';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              if (!focused) {
                haptics.selection();
                navigation.navigate(route.name);
              }
              // Explicit bottom tab press resets that tab's root scroll to top
              resetTabScroll(route.name);
            }
          };

          return (
            <PressableScale
              key={route.key}
              style={[styles.tabItem, { width: tabWidth }]}
              onPress={onPress}
              scaleTo={motionTokens.scales.iconPressed}
              activeOpacity={0.8}
              haptic="none"
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={route.name}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={focused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)'}
                />
                {focused && <View style={styles.dot} />}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: 'rgba(7, 43, 56, 0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  tabsRow: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  lensContainer: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: 'rgba(255, 255, 255, 0.35)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  liquidLensOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  fallbackLens: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  tabItem: {
    height: 60,
    minWidth: spacing.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: spacing.xxs,
  },
});
