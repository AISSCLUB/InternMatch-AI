import Purchases from 'react-native-purchases';

export const REVENUECAT_ENTITLEMENT_ID = 'pro_student';
export const REVENUECAT_OFFERING_ID = 'default';
export const REVENUECAT_MONTHLY_PACKAGE_ID = '$rc_monthly';
export const REVENUECAT_PRODUCT_ID = 'internmatch_pro_student_monthly';

export interface RevenueCatRuntimeState {
  configured: boolean;
  identifiedUserId: string | null;
  reason?: string | null;
}

let isConfigured = false;
let currentIdentifiedUserId: string | null = null;
let configurationReason: string | null = null;

function getPublicApiKey(): string {
  const rawKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (typeof rawKey === 'string') {
    return rawKey.trim();
  }
  return '';
}

/**
 * Initializes the RevenueCat SDK exactly once using the public API key.
 * If an authenticated user ID is provided, configures with that ID; otherwise configures anonymously.
 * If already configured, delegates synchronization to syncRevenueCatUser.
 */
export async function initializeRevenueCat(
  appUserId?: string | null
): Promise<RevenueCatRuntimeState> {
  if (isConfigured) {
    return await syncRevenueCatUser(appUserId);
  }

  const apiKey = getPublicApiKey();
  if (!apiKey) {
    configurationReason = 'missing_api_key';
    return getRevenueCatRuntimeState();
  }

  const normalizedUserId =
    typeof appUserId === 'string' && appUserId.trim() ? appUserId.trim() : null;

  try {
    Purchases.configure({
      apiKey,
      appUserID: normalizedUserId || undefined,
    });
    isConfigured = true;
    currentIdentifiedUserId = normalizedUserId;
    configurationReason = null;
  } catch {
    isConfigured = false;
    currentIdentifiedUserId = null;
    configurationReason = 'configuration_failed';
  }

  return getRevenueCatRuntimeState();
}

/**
 * Synchronizes the RevenueCat identified user with the active Supabase auth state.
 */
export async function syncRevenueCatUser(
  appUserId?: string | null
): Promise<RevenueCatRuntimeState> {
  if (!isConfigured) {
    return await initializeRevenueCat(appUserId);
  }

  const normalizedUserId =
    typeof appUserId === 'string' && appUserId.trim() ? appUserId.trim() : null;

  if (normalizedUserId) {
    if (currentIdentifiedUserId === normalizedUserId) {
      return getRevenueCatRuntimeState();
    }

    try {
      await Purchases.logIn(normalizedUserId);
      currentIdentifiedUserId = normalizedUserId;
      configurationReason = null;
    } catch {
      configurationReason = 'identity_sync_failed';
    }
  } else {
    if (currentIdentifiedUserId === null) {
      return getRevenueCatRuntimeState();
    }

    try {
      await Purchases.logOut();
      currentIdentifiedUserId = null;
      configurationReason = null;
    } catch {
      configurationReason = 'identity_sync_failed';
    }
  }

  return getRevenueCatRuntimeState();
}

/**
 * Returns the current RevenueCat runtime configuration and user identification state.
 */
export function getRevenueCatRuntimeState(): RevenueCatRuntimeState {
  return {
    configured: isConfigured,
    identifiedUserId: currentIdentifiedUserId,
    reason: configurationReason,
  };
}
