import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial OS state
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setIsReducedMotion(enabled);
        }
      })
      .catch(() => {
        // Fallback to false on unsupported platforms
        if (isMounted) {
          setIsReducedMotion(false);
        }
      });

    // Listen for dynamic accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) {
          setIsReducedMotion(enabled);
        }
      }
    );

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  return isReducedMotion;
}

export default useReducedMotion;
