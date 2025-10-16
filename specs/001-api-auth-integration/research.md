# Research & Technical Decisions

**Feature**: API Authentication Integration
**Date**: 2025-10-16
**Status**: Phase 0 Complete

## Overview

Este documento consolida as decisões técnicas, padrões e best practices para implementação do sistema de autenticação e upload de chamadas na extensão Chrome do softphone Scany.

---

## 1. Chrome Extension Storage Strategy

### Decision

**Usar chrome.storage.session para dados sensíveis e chrome.storage.local para persistência durável**

### Rationale

- **chrome.storage.session**:
  - Ideal para JWT tokens (limpa automaticamente ao fechar browser)
  - Não sincroniza entre dispositivos (segurança adicional)
  - Limite: ~10MB (suficiente para tokens e configurações de sessão)
  - Disponível desde Chrome 102 (Manifest V3)

- **chrome.storage.local**:
  - Persiste entre restarts do browser
  - Ideal para fila de uploads pendentes
  - Limite: ~10MB (pode expandir para unlimited com permissão)
  - Sincronização manual entre popup e background worker

### Implementation Pattern

```typescript
// authStorage.ts
export const authStorage = {
  // Session storage (cleared on browser close)
  async saveToken(token: string): Promise<void> {
    await chrome.storage.session.set({ auth_token: token });
  },

  async getToken(): Promise<string | null> {
    const result = await chrome.storage.session.get('auth_token');
    return result.auth_token || null;
  },

  // Local storage (persists across restarts)
  async saveUploadConfig(config: UploadConfig): Promise<void> {
    await chrome.storage.local.set({ upload_config: config });
  }
};
```

### Alternatives Considered

- **localStorage**: Não recomendado para extensions (sandboxing issues)
- **IndexedDB**: Overhead desnecessário para dados simples
- **chrome.storage.sync**: Sincronização indesejada para dados de autenticação

---

## 2. Retry Strategy for API Calls

### Decision

**Exponential backoff com jitter para network/server errors, sem retry para client errors**

### Rationale

- **Exponential Backoff**: Reduz carga no servidor durante falhas temporárias
- **Jitter**: Previne thundering herd problem (múltiplos clientes retrying simultaneamente)
- **Diferenciação de Erros**:
  - **Retryable** (automatic): Network errors, 500, 502, 503, 504
  - **Non-retryable** (display error): 400, 401, 403, 404, 409, 429
  - **Rate Limit (429)**: Queue para retry após cooldown indicado no header

### Implementation Pattern

```typescript
// retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number;
    isRetryable: (error: Error) => boolean;
  }
): Promise<T> {
  let attempt = 0;

  while (attempt < options.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      if (!options.isRetryable(error) || attempt >= options.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      );
      const jitter = Math.random() * delay * 0.1; // 10% jitter

      await sleep(delay + jitter);
    }
  }
}

// Usage for uploads
await retryWithBackoff(() => uploadCall(recording), {
  maxAttempts: 3,
  baseDelay: 1000, // 1s, 2s, 4s
  maxDelay: 4000,
  isRetryable: (error) => error.isNetworkError || error.status >= 500
});
```

### Alternatives Considered

- **Fixed delay retry**: Não escala bem com múltiplos clientes
- **Infinite retry**: Pode causar memory leak se servidor está permanentemente down
- **No retry**: UX ruim para falhas temporárias de rede

---

## 3. Audio Recording for Upload

### Decision

**Usar MediaRecorder API com formato WebM Opus, gravar ambos canais (inbound + outbound)**

### Rationale

- **MediaRecorder API**: Nativo do browser, suporta Chrome extensions
- **WebM Opus**: Codec eficiente (1-2 MB para 5 min de áudio), suportado por backend
- **Dual Channel**: Gravar caller e callee separadamente para melhor qualidade de análise
- **Integração com JsSIP**: Capturar RTCPeerConnection.getReceivers() streams

### Implementation Pattern

```typescript
// SipSession.ts (integration point)
class SipSession {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording(peerConnection: RTCPeerConnection): Promise<void> {
    const stream = new MediaStream();

    // Add all audio tracks (local + remote)
    peerConnection.getReceivers().forEach(receiver => {
      if (receiver.track.kind === 'audio') {
        stream.addTrack(receiver.track);
      }
    });

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 32000 // 32 kbps = good quality, small size
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000); // 1s timeslice
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        resolve(audioBlob);
      };
      this.mediaRecorder!.stop();
    });
  }
}
```

### Alternatives Considered

- **WAV format**: Descomprimido, arquivos muito grandes (50-100 MB para 5 min)
- **MP3 encoding**: Requer biblioteca externa, overhead desnecessário
- **Server-side recording**: Complexidade adicional, latência de rede

---

## 4. Authentication Token Management

### Decision

**Token JWT do Supabase, sem refresh automático, logout silencioso em expiração**

### Rationale

- **Supabase Token**: Backend usa Supabase Auth, token é gerenciado pelo Supabase
- **Sem Refresh**: Conforme clarificação da spec, logout silencioso ao invés de refresh
- **Validation no Startup**: Chamar GET /auth/profile para validar token existente
- **Lifecycle**:
  - Login: Armazenar em chrome.storage.session
  - Startup: Validar token com profile endpoint
  - 401 Response: Clear storage + redirect para login (silent)
  - Logout: Chamar endpoint + clear storage

### Implementation Pattern

```typescript
// authService.ts
export class AuthService {
  async init(): Promise<boolean> {
    const token = await authStorage.getToken();
    if (!token) return false;

    try {
      // Validate token by fetching profile
      const profile = await authApi.getProfile(token);
      await this.storeProfile(profile);
      return true;
    } catch (error) {
      if (error.status === 401) {
        // Token expired/invalid - silent logout
        await this.silentLogout();
        return false;
      }
      throw error;
    }
  }

  private async silentLogout(): Promise<void> {
    await authStorage.clearAll();
    // Redirect handled by component (useEffect detecting null token)
  }
}
```

### Alternatives Considered

- **Automatic Token Refresh**: Adiciona complexidade, não solicitado na spec
- **Modal de Re-auth**: Conforme clarificação, preferiu-se silent redirect
- **Long-lived tokens**: Segurança reduzida, não alinhado com Supabase defaults

---

## 5. Form Validation

### Decision

**Validação cliente-side com biblioteca Yup + backend validation fallback**

### Rationale

- **Yup**: Validação declarativa, integração com React Hook Form ou Formik
- **Client-side First**: UX imediata, reduz chamadas inválidas ao backend
- **Backend Fallback**: Sempre confiar no backend como fonte de verdade

### Validation Rules

```typescript
// validation.ts
import * as Yup from 'yup';

export const registerSchema = Yup.object({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),

  password: Yup.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .matches(/[A-Z]/, 'Senha deve conter letra maiúscula')
    .matches(/[0-9]/, 'Senha deve conter número')
    .required('Senha é obrigatória'),

  name: Yup.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .required('Nome é obrigatório'),

  companyName: Yup.string()
    .required('Nome da empresa é obrigatório'),

  cnpj: Yup.string()
    .matches(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .test('valid-cnpj', 'CNPJ inválido', validateCNPJ)
    .required('CNPJ é obrigatório')
});

// CNPJ validation algorithm
function validateCNPJ(cnpj: string): boolean {
  // Implementation of CNPJ checksum validation
  // (algorith calculates and validates check digits)
  // ...
}
```

### Phone Number Validation

```typescript
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export function validatePhoneNumber(phone: string, country: string = 'BR'): boolean {
  try {
    const number = phoneUtil.parse(phone, country);
    return phoneUtil.isValidNumber(number);
  } catch (error) {
    return false;
  }
}

export function formatPhoneNumber(phone: string, country: string = 'BR'): string {
  try {
    const number = phoneUtil.parse(phone, country);
    return phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL);
  } catch (error) {
    return phone;
  }
}
```

### Alternatives Considered

- **Zod**: Similar ao Yup, mas menos maduro para React forms
- **Custom validation**: Muito código boilerplate
- **Backend-only validation**: UX ruim (wait for API response para ver erros)

---

## 6. Error Handling Patterns

### Decision

**Error boundary pattern + typed error classes + user-friendly Portuguese messages**

### Rationale

- **Typed Errors**: Classificar erros para tratamento apropriado
- **Error Boundary**: React error boundary para capturar erros não tratados
- **User Messages**: Sempre mostrar mensagem em português, nunca stack traces
- **Logging**: Estruturado para diagnóstico (sem dados sensíveis)

### Implementation Pattern

```typescript
// errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error message mapping
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'auth/invalid-credentials': 'Email ou senha incorretos',
  'auth/email-not-confirmed': 'Por favor, confirme seu email antes de fazer login',
  'auth/account-not-found': 'Conta não encontrada',
  'auth/rate-limit': 'Muitas tentativas. Aguarde 15 minutos e tente novamente',

  // Network errors
  'network/timeout': 'Tempo de conexão esgotado. Verifique sua internet',
  'network/offline': 'Sem conexão com a internet',

  // Upload errors
  'upload/file-too-large': 'Arquivo de áudio muito grande',
  'upload/invalid-format': 'Formato de áudio não suportado',

  // Generic fallback
  'unknown': 'Ocorreu um erro inesperado. Tente novamente'
};

// Usage in components
try {
  await authService.login(email, password);
} catch (error) {
  if (error instanceof ApiError) {
    const message = ERROR_MESSAGES[error.code] || ERROR_MESSAGES['unknown'];
    toast.error(message);

    if (error.retryable) {
      // Show retry button
    }
  } else if (error instanceof NetworkError) {
    toast.error(ERROR_MESSAGES['network/offline']);
  }
}
```

### Alternatives Considered

- **Generic catch-all**: Não permite tratamento específico por tipo
- **English messages**: Projeto especifica pt-br
- **Exposing technical details**: Segurança e UX ruins

---

## 7. State Management

### Decision

**React Context API para auth state + local state para forms + chrome.storage como source of truth**

### Rationale

- **Context API**: Suficiente para auth state (não precisa Redux)
- **Local State**: Forms isolados não precisam global state
- **Chrome Storage**: Persistência entre popup closes, fonte única de verdade
- **No Zustand/Redux**: Overhead desnecessário para este escopo

### Implementation Pattern

```typescript
// AuthContext.tsx
interface AuthContextValue {
  isAuthenticated: boolean;
  user: Operator | null;
  uploadConfig: UploadConfig | null;
  login: (email: string, password: string, cnpj: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Operator | null>(null);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);

  useEffect(() => {
    // Init on mount
    authService.init().then((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        loadProfile();
      }
    });
  }, []);

  const login = async (email: string, password: string, cnpj: string) => {
    const response = await authApi.login({ email, password, cnpj });
    await authStorage.saveToken(response.access_token);
    await authStorage.saveUploadConfig({
      projectId: response.defaultProjectId,
      insightId: response.defaultInsightId,
      uploadUrl: response.softphoneUploadUrl
    });

    setIsAuthenticated(true);
    setUser(response.user);
    setUploadConfig(response.uploadConfig);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, uploadConfig, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Alternatives Considered

- **Redux**: Overhead muito grande para auth state simples
- **Zustand**: Adiciona dependência desnecessária
- **Pure chrome.storage**: Falta reatividade no UI

---

## 8. Routing Strategy

### Decision

**State-based routing (conditional rendering) ao invés de React Router**

### Rationale

- **Extension Popup**: Não precisa URLs navegáveis (não é web app)
- **Simplicidade**: Conditional rendering é mais simples para poucos estados
- **Performance**: Menos overhead que React Router para popup pequeno
- **States**: Login, Register, EmailConfirmation, ForgotPassword, ResetPassword, Main (authenticated)

### Implementation Pattern

```typescript
// App.tsx
function App() {
  const { isAuthenticated } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  if (!isAuthenticated) {
    return (
      <ChakraProvider>
        {authView === 'login' && <LoginForm onSwitch={setAuthView} />}
        {authView === 'register' && <RegisterForm onSwitch={setAuthView} />}
        {authView === 'forgot' && <ForgotPasswordForm onSwitch={setAuthView} />}
        {authView === 'reset' && <ResetPasswordForm onSwitch={setAuthView} />}
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <MainApp /> {/* Tabs: Phone, History, Settings */}
    </ChakraProvider>
  );
}
```

### Alternatives Considered

- **React Router**: Overhead desnecessário para extension popup
- **Hash routing**: Adiciona complexidade sem benefício
- **Multiple HTML pages**: Perde contexto React entre navegações

---

## 9. Upload Queue Persistence

### Decision

**JSON serialized array em chrome.storage.local com timestamp-based scheduling**

### Rationale

- **JSON Format**: Simples, debug-friendly, suficiente para volume esperado
- **chrome.storage.local**: Persiste entre restarts (crítico para fila)
- **Timestamp Scheduling**: Determinar próximo retry baseado em timestamp
- **Background Worker**: Processar fila mesmo com popup fechado

### Implementation Pattern

```typescript
// uploadQueue.ts
interface QueuedUpload {
  id: string; // UUID
  recording: {
    caller: string;
    callee: string;
    startedAt: string; // ISO 8601
    durationSeconds: number;
    audioBlob: string; // Base64 encoded (or file path?)
  };
  retryCount: number;
  nextRetryAt: number; // Unix timestamp
  status: 'pending' | 'retrying' | 'failed';
  error?: string;
}

export class UploadQueue {
  async enqueue(recording: CallRecording): Promise<void> {
    const item: QueuedUpload = {
      id: uuid(),
      recording: {
        ...recording,
        audioBlob: await blobToBase64(recording.audioBlob) // or save to IndexedDB?
      },
      retryCount: 0,
      nextRetryAt: Date.now(),
      status: 'pending'
    };

    const queue = await this.getQueue();
    queue.push(item);
    await this.saveQueue(queue);

    // Trigger background worker
    chrome.runtime.sendMessage({ type: 'PROCESS_UPLOAD_QUEUE' });
  }

  async processNext(): Promise<boolean> {
    const queue = await this.getQueue();
    const now = Date.now();

    const item = queue.find(i =>
      i.status === 'pending' && i.nextRetryAt <= now
    );

    if (!item) return false;

    try {
      item.status = 'retrying';
      await this.saveQueue(queue);

      await uploadService.upload(item.recording);

      // Success - remove from queue
      const updatedQueue = queue.filter(i => i.id !== item.id);
      await this.saveQueue(updatedQueue);

      return true;
    } catch (error) {
      item.retryCount++;
      item.error = error.message;

      if (item.retryCount >= 3) {
        item.status = 'failed';
      } else {
        item.status = 'pending';
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, item.retryCount) * 1000;
        item.nextRetryAt = Date.now() + delay;
      }

      await this.saveQueue(queue);
      return false;
    }
  }
}
```

### Audio Blob Storage Consideration

**Decision**: Store audio blobs in IndexedDB, reference by ID in queue

**Rationale**: Base64 encoding increases size by 33%, chrome.storage.local limit is 10MB. Large audio files (5MB) would hit limit quickly. IndexedDB has no practical limit.

```typescript
// audioStorage.ts
export class AudioStorage {
  private db: IDBDatabase;

  async saveAudio(id: string, blob: Blob): Promise<void> {
    const transaction = this.db.transaction(['audios'], 'readwrite');
    const store = transaction.objectStore('audios');
    await store.put({ id, blob });
  }

  async getAudio(id: string): Promise<Blob | null> {
    const transaction = this.db.transaction(['audios'], 'readonly');
    const store = transaction.objectStore('audios');
    const result = await store.get(id);
    return result?.blob || null;
  }
}
```

### Alternatives Considered

- **Base64 in chrome.storage**: Atinge limite rapidamente
- **File System API**: Não disponível em extensions
- **Server-side queueing**: Requer conectividade contínua

---

## 10. Background Worker Integration

### Decision

**Background service worker processa upload queue, popup apenas enfileira**

### Rationale

- **Popup Lifecycle**: Pode fechar a qualquer momento, não confiável para uploads longos
- **Service Worker**: Persiste em background, ideal para processing assíncrono
- **Message Passing**: Popup → Worker via chrome.runtime.sendMessage
- **Periodic Check**: Worker verifica fila a cada 30s (chrome.alarms API)

### Implementation Pattern

```typescript
// background/index.ts
chrome.runtime.onInstalled.addListener(() => {
  // Setup periodic alarm for queue processing
  chrome.alarms.create('PROCESS_UPLOAD_QUEUE', {
    periodInMinutes: 0.5 // 30 seconds
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'PROCESS_UPLOAD_QUEUE') {
    processUploadQueue();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_UPLOAD_QUEUE') {
    processUploadQueue().then(() => sendResponse({ success: true }));
    return true; // Async response
  }
});

async function processUploadQueue(): Promise<void> {
  const queue = new UploadQueue();
  let processed = true;

  // Process all eligible items
  while (processed) {
    processed = await queue.processNext();
  }
}
```

### Alternatives Considered

- **Popup-only uploads**: Não confiável devido a lifecycle
- **Immediate upload only**: Sem retry em falhas
- **Third-party queue library**: Overhead desnecessário

---

## Summary of Key Technologies

| Area | Technology | Justification |
|------|------------|---------------|
| **Language** | TypeScript 4.x | Type safety, melhor DX |
| **UI Framework** | React 18 + Chakra UI | Já usado no projeto |
| **State** | Context API | Suficiente para auth state |
| **Storage** | chrome.storage + IndexedDB | Session tokens + upload queue |
| **Forms** | React Hook Form + Yup | Validação declarativa |
| **HTTP Client** | fetch API | Nativo, sem dependências |
| **Retry** | Custom exponential backoff | Controle fino sobre estratégia |
| **Audio** | MediaRecorder API | Nativo, WebM Opus format |
| **Phone Validation** | google-libphonenumber | Já usado no projeto |
| **Testing** | Jest + Testing Library | Já configurado |

---

## Next Steps

Prosseguir para **Phase 1** com geração de:

1. `data-model.md` - Definições de TypeScript interfaces
2. `contracts/auth-api.yaml` - OpenAPI spec para autenticação
3. `contracts/upload-api.yaml` - OpenAPI spec para uploads
4. `quickstart.md` - Guia de desenvolvimento

---

**Status**: ✅ Research Phase Complete
**Date**: 2025-10-16
**Reviewed By**: Claude Agent
