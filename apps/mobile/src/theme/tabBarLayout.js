export const FLOATING_TAB_BAR_HEIGHT = 60;
export const FLOATING_TAB_BAR_MIN_BOTTOM_INSET = 12;
export const FLOATING_TAB_BAR_HORIZONTAL_MARGIN = 16;
export const FLOATING_TAB_BAR_RADIUS = 30;
export const FLOATING_TAB_BAR_LENS_HEIGHT = 48;
export const FLOATING_TAB_BAR_LENS_TOP = 6;

/**
 * Standard safe bottom scroll padding for all tab-contained screens.
 * Ensures the bottom-most item scrolls completely clear of the floating tab bar
 * and device bottom safe area across all iPhone and Android form factors.
 *
 * @param {number} bottomInset - safe area insets.bottom from useSafeAreaInsets()
 * @param {number} extraPadding - additional spacing buffer above tab bar (default 44px)
 * @returns {number} dynamic pixel bottom padding
 */
export function getTabScreenBottomPadding(bottomInset = 0, extraPadding = 44) {
  const safeBottom = Math.max(bottomInset, FLOATING_TAB_BAR_MIN_BOTTOM_INSET);
  return FLOATING_TAB_BAR_HEIGHT + safeBottom + extraPadding;
}
