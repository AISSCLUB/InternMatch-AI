import { DEFAULT_LOCALE, normalizeLocale } from './i18n';

export const INTL_LOCALE_BY_UI_LOCALE = Object.freeze({
  en: 'en',
  tr: 'tr-TR',
  ar: 'ar',
});

export function getIntlLocale(locale) {
  const normalized = normalizeLocale(locale) || DEFAULT_LOCALE;
  return INTL_LOCALE_BY_UI_LOCALE[normalized] || INTL_LOCALE_BY_UI_LOCALE[DEFAULT_LOCALE];
}

function parseDateValue(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string' && value.length === 10 && value[4] === '-' && value[7] === '-') {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
    const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (localDate.getFullYear() !== parts[0] || localDate.getMonth() !== parts[1] - 1 || localDate.getDate() !== parts[2]) return null;
    return localDate;
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(value, locale, options) {
  const date = parseDateValue(value);
  if (!date) return '';

  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
  } catch (error) {
    console.warn('Failed to format localized date or time:', error);
    return '';
  }
}

export function formatLocalizedDate(value, locale, options) {
  return formatDateValue(value, locale, options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatLocalizedDateTime(value, locale, options) {
  return formatDateValue(value, locale, options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatLocalizedTime(value, locale, options) {
  return formatDateValue(value, locale, options || {
    hour: 'numeric',
    minute: '2-digit',
  });
}
