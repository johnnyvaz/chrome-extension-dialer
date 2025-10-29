/**
 * ═══════════════════════════════════════════════════════════════
 * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
 * ═══════════════════════════════════════════════════════════════
 *
 * PADRÃO ALGORÍTMICO: Exponential Backoff with Jitter
 * ESTRUTURA DE DADOS PRINCIPAL: Promise chain, setTimeout queue
 * COMPLEXIDADE TEMPORAL: O(1) per retry + exponential delay
 * COMPLEXIDADE ESPACIAL: O(1) - constant space
 *
 * 🤔 PORQUE ESTA ABORDAGEM:
 * - Exponential backoff previne "thundering herd problem" quando múltiplos
 *   clientes tentam reconectar simultaneamente após falha de rede
 * - Jitter adiciona aleatoriedade para distribuir requisições no tempo
 * - Delays crescem exponencialmente: 1s → 2s → 4s (configurable)
 * - Abordagem padrão em sistemas distribuídos (AWS SDK, gRPC, etc.)
 *
 * 🔗 CONEXÃO COM LEETCODE:
 * - Padrão: Recursão com delay (não está nos 8 fundamentais, mas usa recursão)
 * - Problemas Similares: Task Scheduler, Design Hit Counter
 * - Variações: Fibonacci backoff, Linear backoff, Circuit breaker pattern
 *
 * ⚡ OTIMIZAÇÕES POSSÍVEIS:
 * - Adicionar circuit breaker para falhas persistentes (após N tentativas, pausar por período maior)
 * - Implementar adaptive backoff baseado em latência da rede
 * - Trade-off: Código mais complexo vs simplicidade atual (escolhemos simplicidade)
 *
 * 🎯 CENÁRIOS DE USO NO PROJETO:
 * - Upload de chamadas quando rede falha temporariamente
 * - Requisições de autenticação em caso de timeout
 * - Qualquer operação de API que pode sofrer falhas transientes
 *
 * 📚 CONCEITOS APRENDIDOS:
 * - Exponential backoff é essencial para resiliência em sistemas distribuídos
 * - Jitter previne sincronização acidental de retries de múltiplos clientes
 * - Promises encadeadas permitem retry transparente sem alterar código cliente
 * - Type generics em TypeScript preservam tipos através de retries
 * ═══════════════════════════════════════════════════════════════
 */

import { RETRY_CONFIG } from '../api/constants';

/**
 * Configuração de retry
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Calcula delay com exponential backoff e jitter
 *
 * Formula: min(maxDelay, baseDelay * 2^attempt + randomJitter)
 * Jitter: 0 to 25% of calculated delay
 *
 * Exemplo:
 * - Attempt 1: 1000ms + jitter(0-250ms) = 1000-1250ms
 * - Attempt 2: 2000ms + jitter(0-500ms) = 2000-2500ms
 * - Attempt 3: 4000ms + jitter(0-1000ms) = 4000-5000ms (capped at maxDelay)
 */
function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * exponentialDelay * 0.25; // 0-25% jitter
  const totalDelay = exponentialDelay + jitter;

  return Math.min(totalDelay, maxDelayMs);
}

/**
 * Verifica se erro é retryable por padrão
 *
 * Retryable errors:
 * - Network errors (Failed to fetch, TypeError)
 * - 5xx server errors
 * - 429 rate limit
 *
 * Non-retryable errors:
 * - 4xx client errors (exceto 429)
 * - 401 unauthorized
 * - Validation errors
 */
function isDefaultRetryable(error: any): boolean {
  // Network errors
  if (error.isNetworkError || error.name === 'NetworkError') {
    return true;
  }

  // TypeError geralmente indica network failure
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // HTTP status codes
  if (error.status) {
    // 5xx server errors são retryable
    if (error.status >= 500) {
      return true;
    }

    // 429 rate limit é retryable
    if (error.status === 429) {
      return true;
    }
  }

  // Outros erros não são retryable
  return false;
}

/**
 * Executa função com retry usando exponential backoff
 *
 * @param fn - Função async a ser executada
 * @param options - Opções de retry
 * @returns Promise com resultado da função
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelayMs = RETRY_CONFIG.BASE_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    shouldRetry = isDefaultRetryable,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Se é a última tentativa ou erro não é retryable, lança erro
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Calcula delay e aguarda
      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs);

      // Callback opcional para logging/monitoring
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      // Aguarda antes de próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // TypeScript safety: nunca deve chegar aqui, mas é necessário para compilador
  throw lastError!;
}

/**
 * Wrapper de retry para funções específicas com configuração padrão
 * Útil para criar funções de retry especializadas
 *
 * @example
 * ```typescript
 * const uploadWithRetry = createRetryWrapper({
 *   maxAttempts: 5,
 *   baseDelayMs: 2000,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`[Upload] Tentativa ${attempt} em ${delay}ms`);
 *   }
 * });
 *
 * await uploadWithRetry(() => uploadCall(data));
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return async function retry<T>(
    fn: () => Promise<T>,
    overrideOptions?: RetryOptions
  ): Promise<T> {
    return retryWithBackoff(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Helper para delay simples (usado em testes ou fluxos customizados)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
