import { AUTH_ENDPOINTS, ERROR_MESSAGES } from "./constants";
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  ConfirmEmailRequest,
  ResendConfirmationRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
  ApiError,
  NetworkError,
} from "../common/auth-types";
import { retryWithBackoff } from "../utils/retry";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Success response (2xx)
    if (response.ok) {
      // Some endpoints return 204 No Content
      if (response.status === 204) {
        return {} as T;
      }
      return await response.json();
    }

    // Error response (4xx/5xx)
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Response has no body or invalid JSON
    }

    const errorCode = errorData.code || "unknown";
    const errorMessage =
      ERROR_MESSAGES[errorCode] ||
      errorData.message ||
      ERROR_MESSAGES["unknown"];

    const apiError = new ApiError(
      response.status,
      errorCode,
      errorMessage,
      response.status >= 500 || response.status === 429, // retryable
      errorData.details
    );

    // Handle 401 globally (token expired/invalid)
    if (response.status === 401) {
      // Trigger logout silencioso através de evento customizado
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    throw apiError;
  } catch (error) {
    // Network error (no response received)
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(ERROR_MESSAGES["network/offline"]);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * HELPER: HTTP REQUEST COM AUTHORIZATION HEADER
 * ═══════════════════════════════════════════════════════════════
 *
 * Usado para endpoints protegidos que precisam de JWT token
 * Pattern: Decorator - adiciona behavior (auth header) ao request
 */
async function authorizedRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return request<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function register(
  payload: RegisterRequest
): Promise<RegisterResponse> {
  return await request<RegisterResponse>(AUTH_ENDPOINTS.REGISTER, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return await request<LoginResponse>(AUTH_ENDPOINTS.LOGIN, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProfile(token: string): Promise<ProfileResponse> {
  return await authorizedRequest<ProfileResponse>(
    AUTH_ENDPOINTS.PROFILE,
    token,
    { method: "GET" }
  );
}

export async function confirmEmail(
  payload: ConfirmEmailRequest
): Promise<MessageResponse> {
  return await request<MessageResponse>(AUTH_ENDPOINTS.CONFIRM_EMAIL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendConfirmation(
  payload: ResendConfirmationRequest
): Promise<MessageResponse> {
  return await request<MessageResponse>(AUTH_ENDPOINTS.RESEND_CONFIRMATION, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(
  token: string,
  payload: ChangePasswordRequest
): Promise<MessageResponse> {
  return await authorizedRequest<MessageResponse>(
    AUTH_ENDPOINTS.CHANGE_PASSWORD,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function forgotPassword(
  payload: ForgotPasswordRequest
): Promise<MessageResponse> {
  return await request<MessageResponse>(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(
  payload: ResetPasswordRequest
): Promise<MessageResponse> {
  return await request<MessageResponse>(AUTH_ENDPOINTS.RESET_PASSWORD, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(userId: string): Promise<MessageResponse> {
  return await request<MessageResponse>(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}
