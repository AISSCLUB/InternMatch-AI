import * as Haptics from 'expo-haptics';

export const haptics = {
  /**
   * Selection feedback for tab bar, picker, and segmented control changes.
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (_) {
      // Non-critical; silently ignore platform/unsupported errors
    }
  },

  /**
   * Light impact for standard primary buttons, chips, and tactile controls.
   */
  lightImpact: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  },

  /**
   * Medium impact for refresh releases and secondary confirmations.
   */
  mediumImpact: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  },

  /**
   * Heavy impact for significant actions (used sparingly).
   */
  heavyImpact: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
  },

  /**
   * Success notification feedback for completed jobs and confirmed status changes.
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  },

  /**
   * Warning notification feedback for non-blocking alerts.
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
  },

  /**
   * Error notification feedback for validation and explicit form failures.
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}
  },
};

export default haptics;
