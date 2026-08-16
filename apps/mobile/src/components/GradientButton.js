import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

/**
 * Solid-color primary CTA button.
 * `color` lets each screen match the Figma variant
 * (indigo "Sign In", dark-blue "Sign Up", teal "Continue" etc.)
 */
export default function GradientButton({ title, onPress, color = colors.primaryBlue, textColor = colors.white, style, outline = false }) {
  if (outline) {
    return (
      <TouchableOpacity style={[styles.button, styles.outline, { borderColor: color }, style]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.text, { color }]}>{title}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: color }, style]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
