import i18n from './i18n';

export const ERROR_TRANSLATION_KEY_BY_CODE = Object.freeze({
  SESSION_ERROR: 'errors.session',
  UNAUTHENTICATED: 'errors.unauthenticated',
  API_NOT_CONFIGURED: 'errors.apiNotConfigured',
  NETWORK_ERROR: 'errors.network',
  MATCHES_LOAD_FAILED: 'errors.matchesLoadFailed',
  MATCH_CALCULATION_TIMEOUT: 'home.errors.calculationTimeout',
  MATCH_CALCULATION_FAILED: 'home.errors.calculationFailed',
  SESSION_EXPIRED: 'home.errors.sessionExpired',
  MATCH_CALCULATION_START_FAILED: 'home.errors.startCalculation',
  APPLICATION_STATUS_UPDATE_FAILED: 'errors.applicationStatusUpdateFailed',
  APPLICATION_NOTES_SAVE_FAILED: 'errors.applicationNotesSaveFailed',
  APPLICATION_LOAD_FAILED: 'errors.applicationLoadFailed',
  APPLICATIONS_LOAD_FAILED: 'errors.applicationsLoadFailed',
  APPLICATION_GENERATION_FAILED: 'errors.coverLetterGenerateFailed',
  APPLICATION_GENERATION_TIMEOUT: 'errors.coverLetterTimeout',
  APPLICATION_GENERATION_START_FAILED: 'errors.coverLetterGenerateFailed',
  RATE_LIMITED: 'errors.authTooManyRequests',
  SERVICE_UNAVAILABLE: 'errors.serviceUnavailable',
  MATCH_NOT_FOUND: 'errors.matchNotFound',
  SAVED_LOAD_FAILED: 'errors.savedLoadFailed',
  SAVED_SAVE_FAILED: 'errors.savedSaveFailed',
  SAVED_UNSAVE_FAILED: 'errors.savedUnsaveFailed',
  SIGN_IN_REQUIRED: 'errors.signInRequired',
  INTERNSHIP_LOAD_FAILED: 'errors.internshipLoadFailed',
  INTERNSHIPS_LOAD_FAILED: 'errors.internshipsLoadFailed',
  MATCH_EXPLANATION_FAILED: 'errors.matchExplanationFailed',
  CV_UPLOAD_FAILED: 'errors.cvUploadFailed',
  CV_PICKER_ERROR: 'errors.cvPickerError',
  CV_EXTRACTION_FAILED: 'errors.cvExtractionFailed',
  CV_TIMEOUT: 'cvUpload.timeoutMessage',
  PROFILE_SAVE_FAILED: 'errors.profileSaveFailed',
  PROFILE_REFRESH_FAILED: 'errors.profileSaveFailed',
  AUTH_SIGN_IN_FAILED: 'errors.authSignInFailed',
  AUTH_SIGN_UP_FAILED: 'errors.authSignUpFailed',
  AUTH_INVALID_CREDENTIALS: 'errors.authInvalidCredentials',
  AUTH_EMAIL_IN_USE: 'errors.authEmailInUse',
  AUTH_INVALID_EMAIL: 'errors.authInvalidEmail',
  AUTH_WEAK_PASSWORD: 'errors.authWeakPassword',
  AUTH_TOO_MANY_REQUESTS: 'errors.authTooManyRequests',
  PHOTO_UPLOAD_FAILED: 'errors.photoUploadFailed',
  PHOTO_REMOVE_FAILED: 'errors.photoRemoveFailed',
  UNKNOWN_ERROR: 'errors.unknown',
});

export function getErrorTranslationKey(error) {
  const code = typeof error === 'string'
    ? error.trim().toUpperCase()
    : typeof error?.code === 'string'
      ? error.code.trim().toUpperCase()
      : '';
  return ERROR_TRANSLATION_KEY_BY_CODE[code] || 'errors.generic';
}

export function getLocalizedErrorMessage(error, translate = i18n.t.bind(i18n)) {
  return translate(getErrorTranslationKey(error));
}
