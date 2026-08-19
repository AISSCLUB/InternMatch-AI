import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import motionTokens from '../motion/motionTokens';
import PressableScale from './PressableScale';

/**
 * Premium Segmented Control for Sign In / Sign Up switching.
 * @param {'signIn' | 'signUp'} activeTab
 * @param {(tab: 'signIn' | 'signUp') => void} onTabChange
 */
export default function AuthSegmentedControl({
  activeTab = 'signIn',
  onTabChange,
  style,
}) {
  const isSignIn = activeTab === 'signIn';

  const handleSignInPress = () => {
    if (!isSignIn && onTabChange) {
      onTabChange('signIn');
    }
  };

  const handleSignUpPress = () => {
    if (isSignIn && onTabChange) {
      onTabChange('signUp');
    }
  };

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="tablist"
    >
      {/* Sign In Tab */}
      <PressableScale
        style={[styles.tab, isSignIn ? styles.activeTab : styles.inactiveTab]}
        onPress={handleSignInPress}
        scaleTo={isSignIn ? 1 : motionTokens.scales.chipPressed}
        activeOpacity={isSignIn ? 1 : motionTokens.opacities.pressed}
        haptic={isSignIn ? 'none' : 'selection'}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSignIn }}
        accessibilityLabel="Sign In tab"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[styles.tabText, isSignIn ? styles.activeTabText : styles.inactiveTabText]}>
          Sign In
        </Text>
      </PressableScale>

      {/* Sign Up Tab */}
      <PressableScale
        style={[styles.tab, !isSignIn ? styles.activeTab : styles.inactiveTab]}
        onPress={handleSignUpPress}
        scaleTo={!isSignIn ? 1 : motionTokens.scales.chipPressed}
        activeOpacity={!isSignIn ? 1 : motionTokens.opacities.pressed}
        haptic={!isSignIn ? 'none' : 'selection'}
        accessibilityRole="tab"
        accessibilityState={{ selected: !isSignIn }}
        accessibilityLabel="Sign Up tab"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[styles.tabText, !isSignIn ? styles.activeTabText : styles.inactiveTabText]}>
          Sign Up
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 116, 144, 0.08)',
    borderRadius: spacing.radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.12)',
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: spacing.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.accentStrong || colors.tealDark,
    shadowColor: colors.accentStrong || colors.tealDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '700',
  },
  inactiveTabText: {
    color: colors.textSecondary || colors.textMuted,
  },
});
