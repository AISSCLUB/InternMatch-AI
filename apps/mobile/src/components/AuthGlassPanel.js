import React from 'react';
import { StyleSheet } from 'react-native';
import GlassSurface from './GlassSurface';
import { spacing } from '../theme/spacing';

/**
 * Dedicated AuthGlassPanel for Sign In / Sign Up screens.
 * Wraps GlassSurface with panel variant and auth padding.
 */
export default function AuthGlassPanel({ children, style, contentStyle }) {
  return (
    <GlassSurface
      variant="panel"
      style={[styles.panel, style]}
      contentStyle={[styles.content, contentStyle]}
    >
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    marginVertical: spacing.sm,
  },
  content: {
    padding: spacing.xl,
  },
});
