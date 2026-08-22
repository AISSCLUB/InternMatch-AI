import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import tr from './locales/tr';
import ar from './locales/ar';

export const SUPPORTED_LOCALES = ['en', 'tr', 'ar'];
export const DEFAULT_LOCALE = 'en';

export function normalizeLocale(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : null;
}

export function isRTLLocale(locale) {
  return normalizeLocale(locale) === 'ar';
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    ar: { translation: ar },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  load: 'languageOnly',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,

});
export default i18n;
