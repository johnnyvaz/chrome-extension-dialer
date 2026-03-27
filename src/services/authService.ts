import * as authApi from "../api/authApi";
import * as authStorage from "../storage/authStorage";
import {
  LoginRequest,
  LoginResponse,
  Operator,
  AuthSession,
  UploadConfig,
} from "../common/auth-types";
import SipUA from "../lib/SipUA";

/**
 * AuthService
 * Gerencia ciclo de vida completo da autenticação e sessão
 */
class AuthService {
  private static instance: AuthService;
  private sipUA: SipUA | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Inicializa sessão ao carregar extensão
   * Verifica se há sessão válida e restaura estado
   */
  async init(): Promise<{ isAuthenticated: boolean; user: Operator | null }> {
    try {
      const session = await authStorage.getAuthSession();

      if (!session) {
        return { isAuthenticated: false, user: null };
      }

      // Verifica expiração
      const now = Date.now();
      const expiresAt = new Date(session.expiresAt).getTime();

      if (now >= expiresAt) {
        await this.silentLogout();
        return { isAuthenticated: false, user: null };
      }

      // Restaura user profile
      const userData = await authStorage.getUserData();

      if (!userData) {
        await this.silentLogout();
        return { isAuthenticated: false, user: null };
      }

      // Auto-configura SIP se disponível (userData tem hasExtension mas não os detalhes)
      // SIP será configurado no próximo login completo

      return { isAuthenticated: true, user: userData as Operator };
    } catch (error) {
      console.error("Erro ao inicializar sessão:", error);
      await this.silentLogout();
      return { isAuthenticated: false, user: null };
    }
  }

  /**
   * Login com CNPJ
   * Auto-configura extensão SIP se disponível
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await authApi.login(credentials);

      // Extrai dados da estrutura success/data
      const { token, user, ramal } = response.data;

      // Salva session
      const session: AuthSession = {
        token: token,
        userId: user.id,
        companyContext: user.empresaId,
        softphoneUploadUrl: user.softphoneUploadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        createdAt: Date.now(),
      };
      await authStorage.saveAuthSession(session);

      // Salva user profile (estrutura Operator completa)
      const operatorData: Operator = {
        id: user.id,
        email: user.email,
        name: user.nome,
        role: user.role as "operator" | "admin" | "manager",
        company: {
          id: user.empresaId,
          name: "", // Não vem na resposta - será carregado no profile
          document: "",
          documentType: "CNPJ",
          createdAt: new Date().toISOString(),
        },
        extension: ramal
          ? {
              id: ramal.id,
              extensionNumber: ramal.numero,
              sipServer: ramal.servidorSip,
              sipPort: ramal.portaSip,
              encryptedPassword: "", // Não vem na resposta
              createdAt: new Date().toISOString(),
            }
          : null,
        defaultProjectId: user.defaultProjectId,
        defaultInsightId: user.defaultInsightId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await authStorage.saveUserData(operatorData);

      // Busca informações da empresa (api_key e defaultProjectId)
      let companyApiKey: string | undefined;
      let companyDefaultProjectId: string | undefined;

      try {
        const { getCompanyInfo } = await import("../api/companyApi");
        const companyInfo = await getCompanyInfo(user.empresaId);

        companyApiKey = companyInfo.api_key;
        companyDefaultProjectId = companyInfo.defaultProjectId;

        console.log("Informações da empresa carregadas:", {
          apiKey: companyApiKey ? "✓" : "✗",
          projectId: companyDefaultProjectId || "N/A",
        });
      } catch (error) {
        console.error("Erro ao buscar informações da empresa:", error);
        // Continua sem api_key se houver erro
      }

      // Salva upload config com api_key e projectId da empresa
      const uploadConfig: UploadConfig = {
        uploadUrl: user.softphoneUploadUrl,
        projectId: companyDefaultProjectId || user.defaultProjectId,
        insightId: user.defaultInsightId,
        apiKey: companyApiKey,
        updatedAt: Date.now(),
      };
      await authStorage.saveUploadConfig(uploadConfig);

      // Auto-configura SIP se ramal disponível
      if (ramal) {
        await this.configureSipExtension(ramal);
      }

      return response;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  /**
   * Configura extensão SIP automaticamente
   * Cria ou atualiza conta SIP no storage antigo para compatibilidade
   */
  private async configureSipExtension(ramal: any): Promise<void> {
    try {
      // Loga informações do ramal para debug
      console.log("Ramal SIP configurado:", {
        numero: ramal.numero,
        servidor: ramal.servidorSip,
        porta: ramal.portaSip,
        ativo: ramal.isActive,
      });

      // Importa dinamicamente para evitar dependências circulares
      const { saveSettings, getSettings } = await import("../storage");

      // Verifica se já existe uma conta SIP
      const existingSettings = await getSettings();

      // Cria configuração SIP compatível com o sistema antigo
      const sipConfig = {
        sipDomain: ramal.servidorSip,
        sipServerAddress: `wss://${ramal.servidorSip}:${ramal.portaSip}/ws`,
        sipUsername: ramal.numero,
        sipPassword: ramal.senhaSip || "", // Senha vem criptografada, pode estar vazia
        sipDisplayName: ramal.numero,
        accountSid: "",
        apiKey: "",
        apiServer: "",
      };

      // Se não existir conta, cria uma nova
      // Se existir, não sobrescreve (usuário pode ter customizado)
      if (!existingSettings || existingSettings.length === 0) {
        saveSettings(sipConfig);
        console.log("Conta SIP criada automaticamente:", sipConfig.sipUsername);
      } else {
        console.log("Conta SIP já existe, mantendo configuração atual");
      }
    } catch (error) {
      console.error("Erro ao configurar SIP:", error);
    }
  }

  /**
   * Logout silencioso (sem chamar API)
   * Usado quando token expira ou é inválido
   */
  async silentLogout(): Promise<void> {
    try {
      // Desconecta SIP se ativo
      if (this.sipUA) {
        this.sipUA.stop();
        this.sipUA = null;
      }

      // Limpa storage
      await authStorage.clearAuthSession();
    } catch (error) {
      console.error("Erro no logout silencioso:", error);
    }
  }

  /**
   * Logout completo (chama API)
   */
  async logout(): Promise<void> {
    try {
      const session = await authStorage.getAuthSession();

      if (session?.token) {
        await authApi.logout(session.token);
      }
    } catch (error) {
      console.error("Erro ao chamar API de logout:", error);
    } finally {
      await this.silentLogout();
    }
  }

  /**
   * Interceptor de erro 401
   * Usado pelo API client para logout automático
   */
  async handle401(): Promise<void> {
    console.warn(
      "Token inválido ou expirado (401) - fazendo logout silencioso"
    );
    await this.silentLogout();
    window.location.reload();
  }

  /**
   * Obtém token atual
   */
  async getToken(): Promise<string | null> {
    return await authStorage.getAuthToken();
  }
}

export const authService = AuthService.getInstance();
