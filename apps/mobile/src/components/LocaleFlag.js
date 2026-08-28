import React from 'react';
import { StyleSheet, View } from 'react-native';
import UnitedKingdomFlag from '../assets/flags/united-kingdom.svg';
import TurkeyFlag from '../assets/flags/turkey.svg';
import SyriaFlag from '../assets/flags/syria.svg';

const FLAG_COMPONENTS = Object.freeze({
  en: UnitedKingdomFlag,
  tr: TurkeyFlag,
  ar: SyriaFlag,
});

export default function LocaleFlag({ locale, width = 26, height = 18 }) {
  const Flag = FLAG_COMPONENTS[locale];
  if (!Flag) return null;

  return (
    <View
      style={[
        styles.frame,
        { width, height, borderRadius: Math.max(2, Math.round(height * 0.18)) },
      ]}
    >
      <Flag width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
});
