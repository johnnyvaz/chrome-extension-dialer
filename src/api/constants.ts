export const MSG_SOMETHING_WRONG = "Something went wrong, please try again";

/**
 * =============================================================================
 * API AUTHENTICATION CONSTANTS
 * =============================================================================
 */

/**
 * Base URL for Scany API (staging environment)
 */
export const API_BASE_URL = 'http://localhost:3000/api/v1';
// export const API_BASE_URL = 'https://api.stage.scany.com.br/api/v1';

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  PROFILE: `${API_BASE_URL}/auth/profile`,
  CONFIRM_EMAIL: `${API_BASE_URL}/auth/confirm-email`,
  RESEND_CONFIRMATION: `${API_BASE_URL}/auth/confirm-email/resend`,
  CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password/confirm`,
} as const;

/**
 * Upload endpoints
 */
export const UPLOAD_ENDPOINTS = {
  SOFTPHONE_UPLOAD: `${API_BASE_URL}/softphone/upload`,
  WEBHOOK_SOFTPHONE_DUAL: (projectId: string) => `${API_BASE_URL}/webhook/softphone/${projectId}/upload`,
} as const;

/**
 * Company endpoints
 */
export const COMPANY_ENDPOINTS = {
  GET_COMPANY: (companyId: string) => `${API_BASE_URL}/empresas/${companyId}`,
} as const;

/**
 * Storage keys for chrome.storage
 */
export const STORAGE_KEYS = {
  SESSION: {
    AUTH_TOKEN: 'auth_token',
    USER_ID: 'user_id',
    COMPANY_CONTEXT: 'company_context',
    TOKEN_EXPIRES_AT: 'token_expires_at',
  },
  LOCAL: {
    UPLOAD_CONFIG: 'upload_config',
    UPLOAD_QUEUE: 'upload_queue',
    SETTINGS: 'settings',
  },
} as const;

/**
 * Retry configuration for failed requests
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 4000,
} as const;

/**
 * Upload limits
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  SUPPORTED_FORMATS: ['audio/webm', 'audio/wav'] as const,
} as const;

/**
 * Error messages in Portuguese
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'auth/invalid-credentials': 'Email ou senha incorretos',
  'auth/email-not-confirmed': 'Por favor, confirme seu email antes de fazer login',
  'auth/account-not-found': 'Conta não encontrada',
  'auth/rate-limit': 'Muitas tentativas. Aguarde 15 minutos e tente novamente',
  'auth/email-in-use': 'Este email já está em uso',
  'auth/invalid-cnpj': 'CNPJ inválido',

  // Network errors
  'network/timeout': 'Tempo de conexão esgotado. Verifique sua internet',
  'network/offline': 'Sem conexão com a internet',

  // Upload errors
  'upload/file-too-large': 'Arquivo de áudio muito grande',
  'upload/invalid-format': 'Formato de áudio não suportado',

  // Generic fallback
  'unknown': 'Ocorreu um erro inesperado. Tente novamente',
  'unauthorized': 'Sessão expirada. Faça login novamente',
} as const;
