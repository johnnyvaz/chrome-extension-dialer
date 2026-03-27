/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - authStorage.ts
 * ═══════════════════════════════════════════════════════════════
 *
 * 🏗️ ARQUITETURA ESCOLHIDA: Facade Pattern + Async Storage Abstraction
 * 📊 ESTRUTURAS PRINCIPAIS: Hash Map (chrome.storage internamente), Promises
 * 🔄 FLUXO DE DADOS: App → authStorage → chrome.storage.session/local → Chrome
 *
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. Facade Pattern: Simplifica interface complexa do chrome.storage
 * 2. Async/Await: Toda API é Promise-based para consistência
 * 3. Type Safety: TypeScript garante tipos corretos em get/set
 * 4. Separation of Concerns: Session vs Local storage claramente separados
 *
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - chrome.storage.session é efetivamente um Hash Map persistente
 * - Complexidade O(1) para get/set (hash table internamente)
 * - Session storage auto-limpa ao fechar browser (segurança)
 * - Local storage persiste indefinidamente (configurações)
 * - Operações são async por serem I/O bound (não CPU bound)
 *
 * TRADE-OFFS:
 * - Session vs Local: Segurança (session) vs Persistência (local)
 * - Type safety: Mais código vs menos bugs
 * - Abstraction: Facilidade de uso vs controle fino
 * ═══════════════════════════════════════════════════════════════
 */

import { STORAGE_KEYS } from '../api/constants';
import {
  AuthSession,
  Operator,
  UploadConfig,
} from '../common/auth-types';

/**
 * ═══════════════════════════════════════════════════════════════
 * SESSION STORAGE (chrome.storage.session)
 * ═══════════════════════════════════════════════════════════════
 *
 * Usado para dados sensíveis que devem ser limpos ao fechar browser:
 * - JWT access token
 * - User ID
 * - Company context
 * - Token expiration
 *
 * Vantagens:
 * - Auto-limpa ao fechar browser (segurança)
 * - Não persiste em disco (menos risco de leak)
 * - Disponível em todas as abas da extensão
 *
 * Limitações:
 * - Quota: 10MB total
 * - Perdido ao fechar browser
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Salva sessão de autenticação completa
 */
export async function saveAuthSession(session: AuthSession): Promise<void> {
  await chrome.storage.session.set({
    [STORAGE_KEYS.SESSION.AUTH_TOKEN]: session.token,
    [STORAGE_KEYS.SESSION.USER_ID]: session.userId,
    [STORAGE_KEYS.SESSION.COMPANY_CONTEXT]: session.companyContext,
    [STORAGE_KEYS.SESSION.TOKEN_EXPIRES_AT]: session.expiresAt,
  });
}

/**
 * Recupera sessão de autenticação completa
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const result = await chrome.storage.session.get([
    STORAGE_KEYS.SESSION.AUTH_TOKEN,
    STORAGE_KEYS.SESSION.USER_ID,
    STORAGE_KEYS.SESSION.COMPANY_CONTEXT,
    STORAGE_KEYS.SESSION.TOKEN_EXPIRES_AT,
  ]);

  const token = result[STORAGE_KEYS.SESSION.AUTH_TOKEN];
  const userId = result[STORAGE_KEYS.SESSION.USER_ID];
  const companyContext = result[STORAGE_KEYS.SESSION.COMPANY_CONTEXT];
  const expiresAt = result[STORAGE_KEYS.SESSION.TOKEN_EXPIRES_AT];

  // Se qualquer campo essencial falta, retorna null
  if (!token || !userId || !companyContext) {
    return null;
  }

  return {
    token,
    userId,
    companyContext,
    softphoneUploadUrl: '', // Será recuperado do local storage
    expiresAt: expiresAt || '',
    createdAt: Date.now(),
  };
}

/**
 * Recupera apenas o token de autenticação
 */
export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.SESSION.AUTH_TOKEN);
  return result[STORAGE_KEYS.SESSION.AUTH_TOKEN] || null;
}

/**
 * Recupera apenas o ID do usuário
 */
export async function getUserId(): Promise<string | null> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.SESSION.USER_ID);
  return result[STORAGE_KEYS.SESSION.USER_ID] || null;
}

/**
 * Verifica se usuário está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Limpa toda sessão de autenticação (logout)
 */
export async function clearAuthSession(): Promise<void> {
  await chrome.storage.session.remove([
    STORAGE_KEYS.SESSION.AUTH_TOKEN,
    STORAGE_KEYS.SESSION.USER_ID,
    STORAGE_KEYS.SESSION.COMPANY_CONTEXT,
    STORAGE_KEYS.SESSION.TOKEN_EXPIRES_AT,
  ]);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * LOCAL STORAGE (chrome.storage.local)
 * ═══════════════════════════════════════════════════════════════
 *
 * Usado para dados não-sensíveis que devem persistir:
 * - Configuração de upload (projectId, insightId, uploadUrl)
 * - Preferências de usuário
 * - Última conta usada (para pré-preencher login)
 *
 * Vantagens:
 * - Persiste indefinidamente
 * - Maior quota (5MB padrão, pode ser aumentada com "unlimitedStorage")
 * - Sincronizável entre devices (chrome.storage.sync)
 *
 * Limitações:
 * - NÃO deve conter dados sensíveis (tokens, passwords)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Salva configuração de upload (projectId, insightId, uploadUrl, apiKey)
 */
export async function saveUploadConfig(config: UploadConfig): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LOCAL.UPLOAD_CONFIG]: {
      uploadUrl: config.uploadUrl,
      projectId: config.projectId,
      insightId: config.insightId,
      apiKey: config.apiKey,
      updatedAt: Date.now(),
    },
  });
}

/**
 * Recupera configuração de upload
 */
export async function getUploadConfig(): Promise<UploadConfig | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LOCAL.UPLOAD_CONFIG);
  const config = result[STORAGE_KEYS.LOCAL.UPLOAD_CONFIG];

  if (!config || !config.projectId) {
    return null;
  }

  return config;
}

/**
 * Salva dados do usuário logado (não-sensíveis)
 * Usado para pré-preencher forms e mostrar info do usuário
 */
export async function saveUserData(user: Operator): Promise<void> {
  await chrome.storage.local.set({
    user_profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: user.company.name,
      companyDocument: user.company.document,
      hasExtension: !!user.extension,
      updatedAt: Date.now(),
    },
  });
}

/**
 * Recupera dados do usuário logado
 */
export async function getUserData(): Promise<Partial<Operator> | null> {
  const result = await chrome.storage.local.get('user_profile');
  return result.user_profile || null;
}

/**
 * Salva último email/CNPJ usado (para pré-preencher login)
 */
export async function saveLastLoginInfo(email: string, cnpj: string): Promise<void> {
  await chrome.storage.local.set({
    last_login: {
      email,
      cnpj,
      savedAt: Date.now(),
    },
  });
}

/**
 * Recupera último email/CNPJ usado
 */
export async function getLastLoginInfo(): Promise<{ email: string; cnpj: string } | null> {
  const result = await chrome.storage.local.get('last_login');
  const lastLogin = result.last_login;

  if (!lastLogin || !lastLogin.email || !lastLogin.cnpj) {
    return null;
  }

  return {
    email: lastLogin.email,
    cnpj: lastLogin.cnpj,
  };
}

/**
 * Limpa todos dados locais (usado em logout completo ou reset)
 */
export async function clearAllLocalData(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * ═══════════════════════════════════════════════════════════════
 * UTILITÁRIOS DE STORAGE
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Recupera quota de storage disponível
 * Útil para monitoramento e debugging
 */
export async function getStorageInfo(): Promise<{
  session: { bytesInUse: number; quota: number };
  local: { bytesInUse: number; quota: number };
}> {
  const sessionBytesInUse = await chrome.storage.session.getBytesInUse();
  const localBytesInUse = await chrome.storage.local.getBytesInUse();

  return {
    session: {
      bytesInUse: sessionBytesInUse,
      quota: 10 * 1024 * 1024, // 10MB (limite do Chrome)
    },
    local: {
      bytesInUse: localBytesInUse,
      quota: 5 * 1024 * 1024, // 5MB padrão (pode ser maior com "unlimitedStorage")
    },
  };
}

/**
 * Watch storage changes (útil para sincronizar estado entre popup e background)
 */
export function watchStorageChanges(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'session' || areaName === 'local') {
      callback(changes);
    }
  });
}

/**
 * Exemplo de uso do watchStorageChanges:
 *
 * ```typescript
 * watchStorageChanges((changes) => {
 *   if (changes[STORAGE_KEYS.SESSION.AUTH_TOKEN]) {
 *     console.log('Token changed:', changes[STORAGE_KEYS.SESSION.AUTH_TOKEN].newValue);
 *     // Atualizar UI ou state
 *   }
 * });
 * ```
 */
