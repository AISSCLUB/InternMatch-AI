import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n, { DEFAULT_LOCALE, isRTLLocale, normalizeLocale } from './i18n';

export const LOCALE_STORAGE_KEY = 'internmatch.uiLocale';

const LocalizationContext = createContext(null);

export function detectDeviceLocale() {
  try {
    const locales = getLocales();
    const primary = Array.isArray(locales) && locales.length > 0 ? locales[0] : null;
    return normalizeLocale(primary?.languageTag) || normalizeLocale(primary?.languageCode) || DEFAULT_LOCALE;
  } catch (error) {
    console.warn('Failed to detect device locale:', error);
    return DEFAULT_LOCALE;
  }
}

export function LocalizationProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [initialized, setInitialized] = useState(false);
  const changeGenerationRef = useRef(0);
  const localeChangeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      let initialLocale = DEFAULT_LOCALE;

      try {
        const storedValue = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        initialLocale = normalizeLocale(storedValue) || detectDeviceLocale();
      } catch (error) {
        console.warn('Failed to read saved UI locale:', error);
        initialLocale = detectDeviceLocale();
      }

      try {
        await i18n.changeLanguage(initialLocale);
      } catch (error) {
        console.warn('Failed to activate initial UI locale:', error);
        initialLocale = DEFAULT_LOCALE;
        await i18n.changeLanguage(DEFAULT_LOCALE);
      }

      if (!active) return;
      setLocaleState(initialLocale);
      setInitialized(true);
    };

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    if (!normalized) return Promise.resolve(false);

    const generation = ++changeGenerationRef.current;

    const applyLocale = async () => {
      if (generation !== changeGenerationRef.current) return false;

      await i18n.changeLanguage(normalized);
      if (generation !== changeGenerationRef.current) return false;

      try {
        await AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalized);
      } catch (error) {
        console.warn('Failed to persist UI locale:', error);
      }

      if (generation !== changeGenerationRef.current) return false;
      setLocaleState(normalized);
      return true;
    };

    const task = localeChangeQueueRef.current.then(applyLocale, applyLocale);
    localeChangeQueueRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, []);

  const value = useMemo(() => ({
    locale,
    isRTL: isRTLLocale(locale),
    initialized,
    setLocale,
  }), [initialized, locale, setLocale]);

  if (!initialized) return null;

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useLocalization must be used within a LocalizationProvider');
  return context;
}

export default LocalizationContext;
