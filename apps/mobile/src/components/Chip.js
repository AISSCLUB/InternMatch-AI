import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

// variant: 'skill' (mint green, used on profile/edit-profile) | 'gap' (orange outline, used on Why-You-Match) | 'neutral'
export default function Chip({ label, variant = 'skill', onRemove, selected, onPress }) {
  const palette = {
    skill: { bg: colors.greenBg, fg: '#0F8A5F' },
    gap: { bg: colors.white, fg: colors.orange, border: colors.orange },
    neutral: { bg: '#EDEDED', fg: colors.textMuted },
  }[variant];

  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.teal : palette.bg },
        palette.border ? { borderWidth: 1, borderColor: palette.border } : null,
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.white : palette.fg }]}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={palette.fg} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
