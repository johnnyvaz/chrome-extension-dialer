/**
 * =============================================================================
 * AUTHENTICATION TYPE DEFINITIONS
 * =============================================================================
 *
 * Types for the new authentication system.
 * Separated from common/types.ts to avoid circular dependencies.
 */

/**
 * Error classes for authentication system
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable: boolean = false,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string = "Erro de conexão") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

/**
 * =============================================================================
 * AUTHENTICATION DATA MODELS
 * =============================================================================
 */

export interface Company {
  id: string;
  name: string;
  document: string;
  documentType: "CNPJ" | "CPF";
  createdAt: string;
}

export interface SipExtension {
  id: string;
  extensionNumber: string;
  sipServer: string;
  sipPort: number;
  encryptedPassword: string;
  createdAt: string;
}

export interface Operator {
  id: string;
  email: string;
  name: string;
  role: "operator" | "admin" | "manager";
  company: Company;
  extension: SipExtension | null;
  defaultProjectId: string;
  defaultInsightId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  companyContext: string;
  softphoneUploadUrl: string;
  expiresAt: string;
  createdAt: number;
}

export interface UploadConfig {
  uploadUrl: string;
  projectId: string;
  insightId: string;
  updatedAt: number;
}

/**
 * =============================================================================
 * API REQUEST/RESPONSE TYPES
 * =============================================================================
 */

// Registration
export interface RegisterRequest {
  email: string;
  password: string;
  nome: string; // Backend usa 'nome' não 'name'
  empresa: string; // Backend usa 'empresa' não 'companyName'
  cnpj: string; // Backend usa 'cnpj' não 'document'
  ramalNumero?: string; // Backend usa 'ramalNumero' não 'extensionNumber'
  ramalServidorSip?: string;
  ramalPortaSip?: number;
  ramalSenhaSip?: string;
}

export interface RegisterResponse {
  message: string;
  defaultProjectId: string;
  defaultInsightId: string;
  softphoneUploadUrl: string;
}

// Login
export interface LoginRequest {
  email: string;
  password: string;
  cnpj: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      nome: string;
      role: string;
      empresaId: string;
      emailConfirmado: boolean;
      defaultProjectId: string;
      defaultInsightId: string;
      softphoneUploadUrl: string;
    };
    ramal?: {
      id: string;
      numero: string;
      servidorSip: string;
      portaSip: number;
      senhaSip?: string; // Senha pode não vir na resposta (segurança)
      isActive: boolean;
    };
  };
  message: string;
  timestamp: string;
}

// Profile
export interface ProfileResponse {
  user: Operator;
  defaultProjectId: string;
  defaultInsightId: string;
  softphoneUploadUrl: string;
}

// Email Confirmation
export interface ConfirmEmailRequest {
  access_token: string;
}

export interface ResendConfirmationRequest {
  email: string;
}

// Password Management
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  access_token: string;
  newPassword: string;
}

// Generic response
export interface MessageResponse {
  message: string;
}

/**
 * =============================================================================
 * CALL RECORDING TYPES
 * =============================================================================
 */

export type UploadStatus =
  | "pending"
  | "uploading"
  | "completed"
  | "failed"
  | "retrying";

export interface CallRecording {
  id: string;
  caller: string;
  callee: string;
  startedAt: string;
  durationSeconds: number;
  audioBlob: Blob;
  audioSizeBytes: number;
  projectId: string;
  insightId: string;
  uploadStatus: UploadStatus;
  createdAt: number;
}

export interface UploadQueueItem {
  id: string;
  recordingId: string;
  audioStorageId: string;
  metadata: {
    caller: string;
    callee: string;
    startedAt: string;
    durationSeconds: number;
    projectId: string;
    insightId: string;
  };
  retryCount: number;
  nextRetryAt: number;
  status: "pending" | "retrying" | "failed";
  error?: string;
  createdAt: number;
  lastAttemptAt?: number;
}

export interface UploadCallPayload {
  audio: File | Blob;
  metadata: {
    caller: string;
    callee: string;
    startedAt: string;
    durationSeconds: number;
    projectId: string;
    insightId: string;
  };
}

export interface UploadCallResponse {
  recordingId: string;
  message: string;
}
