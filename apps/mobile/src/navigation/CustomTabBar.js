import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import motionTokens from '../motion/motionTokens';
import haptics from '../services/haptics';
import PressableScale from '../components/PressableScale';

const ICONS = {
  Home: 'home',
  Internships: 'business',
  Matchups: 'radio-button-on',
  Applications: 'document-text',
  Profile: 'person-circle',
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing.xs);

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset, height: 56 + bottomInset }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const iconName = ICONS[route.name] ?? 'ellipse';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name);
          }
        };

        return (
          <PressableScale
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            scaleTo={motionTokens.scales.iconPressed}
            activeOpacity={0.8}
            haptic="none"
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={route.name}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={focused ? (colors.accent || colors.teal) : (colors.textTertiary || colors.textMuted)}
            />
            {focused && <View style={styles.dot} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface || colors.cardBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    height: 48,
    minWidth: spacing.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent || colors.teal,
    marginTop: spacing.xxs + 1,
  },
});
