import { supabase } from '../lib/supabase';

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new ApiError(error.message, 401, 'SESSION_ERROR');
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new ApiError('No active authenticated session.', 401, 'UNAUTHENTICATED');
  }

  return token;
}

function extractApiError(payload: any, fallback: string) {
  const error = payload?.detail?.error ?? payload?.error;

  return {
    message: error?.message ?? payload?.detail ?? fallback,
    code: error?.code,
    details: error?.details,
  };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('EXPO_PUBLIC_API_URL is not configured.', 0, 'API_NOT_CONFIGURED');
  }

  const headers = new Headers(options.headers ?? {});

  if (options.authenticated !== false) {
    const token = await getAccessToken();
    headers.set('Authorization', 'Bearer ' + token);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = apiBaseUrl + normalizedPath;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed.';
    throw new ApiError(message, 0, 'NETWORK_ERROR');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const parsed = extractApiError(
      payload,
      'Request failed with status ' + response.status + '.'
    );

    throw new ApiError(parsed.message, response.status, parsed.code, parsed.details);
  }

  return payload as T;
}

export type AuthSyncResponse = {
  user_id: string;
  email: string | null;
  has_profile: boolean;
};

export async function syncAuthenticatedUser(): Promise<AuthSyncResponse> {
  return apiRequest<AuthSyncResponse>('/auth/sync', {
    method: 'POST',
  });
}

export type EducationEntry = {
  institution: string;
  degree: string;
  start_year: number | null;
  end_year: number | null;
};

export type ExperienceEntry = {
  company: string;
  role: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type ProjectEntry = {
  title: string;
  tech_stack: string[];
  description: string | null;
};

export type StudentProfileResponse = {
  id: string;
  user_id: string;
  full_name: string;
  headline: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  preferences: Record<string, unknown>;
  cv_url: string | null;
};

export type UpsertProfilePayload = {
  full_name: string;
  headline?: string | null;
  preferences?: Record<string, unknown>;
};

export async function getProfile(): Promise<StudentProfileResponse> {
  return apiRequest<StudentProfileResponse>('/profile', {
    method: 'GET',
  });
}

export async function upsertProfile(
  payload: UpsertProfilePayload
): Promise<StudentProfileResponse> {
  return apiRequest<StudentProfileResponse>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

