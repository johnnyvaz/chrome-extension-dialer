import { UPLOAD_ENDPOINTS, UPLOAD_LIMITS, ERROR_MESSAGES } from "./constants";
import {
  UploadCallPayload,
  UploadCallBackendPayload,
  UploadCallResponse,
  UploadDualAudioPayload,
  UploadDualAudioResponse,
  ApiError,
  NetworkError,
} from "../common/auth-types";
import { getAuthToken, getUserId } from "../storage/authStorage";

/**
 * Upload de gravação de chamada com áudio e metadados
 * Usa multipart/form-data para enviar arquivo de áudio + campos do backend
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

  // Obtém token de autenticação e userId
  const token = await getAuthToken();
  const userId = await getUserId();

  if (!token || !userId) {
    throw new ApiError(
      401,
      "unauthorized",
      ERROR_MESSAGES["unauthorized"],
      false
    );
  }

  // Gera um ID único para a chamada
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Converte dados para formato esperado pelo backend (apenas campos obrigatórios)
  const backendPayload: UploadCallBackendPayload = {
    agentId: userId,
    callId: callId,
    duration: payload.metadata.durationSeconds,
  };

  // Prepara FormData
  const formData = new FormData();

  // Adiciona arquivo de áudio
  const audioFile = new File([payload.audio], "recording.webm", {
    type: payload.audio.type,
  });
  formData.append("audio", audioFile);

  // Adiciona apenas os 3 campos obrigatórios conforme Swagger
  formData.append("agentId", backendPayload.agentId);
  formData.append("callId", backendPayload.callId);
  formData.append("duration", backendPayload.duration.toString());

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

/**
 * Upload de dois áudios separados (agente + cliente) para o webhook do softphone
 * Usa endpoint /webhook/softphone/{projeto}/upload com x-api-key
 */
export async function uploadDualAudio(
  payload: UploadDualAudioPayload & {
    ramal?: string;
    phoneNumber?: string;
    timestamp?: number;
  }
): Promise<UploadDualAudioResponse> {
  // Validação de tamanho dos arquivos
  if (payload.agenteAudio.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      400,
      "upload/file-too-large",
      "Áudio do agente muito grande (máx 10MB)",
      false
    );
  }

  if (payload.clienteAudio.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      400,
      "upload/file-too-large",
      "Áudio do cliente muito grande (máx 10MB)",
      false
    );
  }

  if (!payload.apiKey) {
    throw new ApiError(
      401,
      "unauthorized",
      "API key não configurada",
      false
    );
  }

  if (!payload.projectId) {
    throw new ApiError(
      400,
      "validation/missing-project",
      "Project ID não configurado",
      false
    );
  }

  // Gera nome base do arquivo no padrão especificado
  const timestamp = payload.timestamp || Date.now();
  const uniqueId = `${timestamp}.0`;
  const ramal = payload.ramal || "0000";
  const phoneNumber = payload.phoneNumber || "unknown";
  const baseFilename = `${timestamp}-RAMAL-${ramal}-NUMERO-${phoneNumber}-UNIQUEID-${uniqueId}`;

  // Prepara FormData
  const formData = new FormData();

  // Adiciona arquivo de áudio do agente com nome formatado
  const agenteFile = new File(
    [payload.agenteAudio],
    `${baseFilename}-agente.wav`,
    { type: "audio/wav" }
  );
  formData.append("agente", agenteFile);

  // Adiciona arquivo de áudio do cliente com nome formatado
  const clienteFile = new File(
    [payload.clienteAudio],
    `${baseFilename}-cliente.wav`,
    { type: "audio/wav" }
  );
  formData.append("cliente", clienteFile);

  try {
    const response = await fetch(
      UPLOAD_ENDPOINTS.WEBHOOK_SOFTPHONE_DUAL(payload.projectId),
      {
        method: "POST",
        headers: {
          "x-api-key": payload.apiKey,
          // NÃO adicionar Content-Type - browser define automaticamente com boundary
        },
        body: formData,
      }
    );

    if (response.ok) {
      // API retorna 201 Created
      return {
        success: true,
        message: "Áudios enviados com sucesso",
      };
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
      errorData.message || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES["unknown"];

    const apiError = new ApiError(
      response.status,
      errorCode,
      errorMessage,
      response.status >= 500,
      errorData.details
    );

    throw apiError;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(ERROR_MESSAGES["network/offline"]);
  }
}
