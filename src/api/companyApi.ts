import { COMPANY_ENDPOINTS, ERROR_MESSAGES } from "./constants";
import { ApiError, NetworkError, CompanyInfo } from "../common/auth-types";
import { getAuthToken } from "../storage/authStorage";

/**
 * Busca informações da empresa incluindo api_key e defaultProjectId
 */
export async function getCompanyInfo(
  companyId: string
): Promise<CompanyInfo> {
  const token = await getAuthToken();

  if (!token) {
    throw new ApiError(
      401,
      "unauthorized",
      ERROR_MESSAGES["unauthorized"],
      false
    );
  }

  try {
    const response = await fetch(COMPANY_ENDPOINTS.GET_COMPANY(companyId), {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();

      // API retorna { success: true, data: { ... } }
      if (result.success && result.data) {
        return {
          id: result.data.id,
          nome: result.data.nome,
          cnpj: result.data.cnpj,
          api_key: result.data.api_key,
          defaultProjectId: result.data.defaultProjectId || result.data.default_project_id,
          saldo_creditos: result.data.saldo_creditos,
          created_at: result.data.created_at,
          segmento: result.data.segmento,
          volume_auditorias_mensal: result.data.volume_auditorias_mensal,
        };
      }

      throw new ApiError(
        500,
        "unknown",
        "Formato de resposta inválido",
        false
      );
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
      response.status >= 500,
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
