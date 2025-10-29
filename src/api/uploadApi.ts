import { UPLOAD_ENDPOINTS, UPLOAD_LIMITS, ERROR_MESSAGES } from "./constants";
import {
  UploadCallPayload,
  UploadCallResponse,
  ApiError,
  NetworkError,
} from "../common/auth-types";
import { getAuthToken } from "../storage/authStorage";

/**
 * Upload de gravação de chamada com áudio e metadados
 * Usa multipart/form-data para enviar arquivo de áudio + JSON metadata
 */
export async function uploadCall(
  payload: UploadCallPayload
): Promise<UploadCallResponse> {
  // Validação de tamanho do arquivo
  if (payload.audio.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      400,
      "upload/file-too-large",
      ERROR_MESSAGES["upload/file-too-large"],
      false
    );
  }

  // Validação de formato
  if (!UPLOAD_LIMITS.SUPPORTED_FORMATS.includes(payload.audio.type as any)) {
    throw new ApiError(
      400,
      "upload/invalid-format",
      ERROR_MESSAGES["upload/invalid-format"],
      false
    );
  }

  // Obtém token de autenticação
  const token = await getAuthToken();
  if (!token) {
    throw new ApiError(
      401,
      "unauthorized",
      ERROR_MESSAGES["unauthorized"],
      false
    );
  }

  // Prepara FormData
  const formData = new FormData();

  // Adiciona arquivo de áudio
  const audioFile = new File([payload.audio], "recording.webm", {
    type: payload.audio.type,
  });
  formData.append("audio", audioFile);

  // Adiciona metadata como JSON string
  formData.append("metadata", JSON.stringify(payload.metadata));

  try {
    const response = await fetch(UPLOAD_ENDPOINTS.SOFTPHONE_UPLOAD, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NÃO adicionar Content-Type - browser define automaticamente com boundary
      },
      body: formData,
    });

    if (response.ok) {
      return await response.json();
    }

    // Error response
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Response has no body
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
      response.status >= 500 || response.status === 429,
      errorData.details
    );

    // Trigger unauthorized event for 401
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    throw apiError;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(ERROR_MESSAGES["network/offline"]);
  }
}
