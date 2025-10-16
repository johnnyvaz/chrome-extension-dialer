# Data Model

**Feature**: API Authentication Integration
**Date**: 2025-10-16
**Status**: Phase 1 Design

## Overview

Este documento define o modelo de dados para o sistema de autenticação e upload de chamadas. Todas as interfaces TypeScript estão definidas aqui como fonte única de verdade para os tipos usados na aplicação.

---

## Core Authentication Entities

### Operator

Representa um operador que usa o softphone.

```typescript
/**
 * Operador autenticado no sistema
 */
export interface Operator {
  /** ID único do operador (UUID) */
  id: string;

  /** Email do operador (usado para login) */
  email: string;

  /** Nome completo do operador */
  name: string;

  /** Role/função do operador no sistema */
  role: 'operator' | 'admin' | 'manager';

  /** Empresa à qual o operador pertence */
  company: Company;

  /** Extensão SIP configurada (pode ser null se não configurada) */
  extension: SipExtension | null;

  /** ID do projeto padrão para analytics */
  defaultProjectId: string;

  /** ID do insight padrão para analytics */
  defaultInsightId: string;

  /** Data de criação da conta */
  createdAt: string; // ISO 8601

  /** Data da última atualização */
  updatedAt: string; // ISO 8601
}
```

**Validations**:
- `email`: Formato RFC 5322, único no sistema
- `name`: Mínimo 3 caracteres
- `role`: Um dos valores enum permitidos

**Relationships**:
- `1:1` com Company
- `1:1` com SipExtension (opcional)
- `1:N` com CallRecording

---

### Company

Representa a empresa à qual operadores pertencem.

```typescript
/**
 * Empresa (multi-tenant context)
 */
export interface Company {
  /** ID único da empresa (UUID) */
  id: string;

  /** Nome da empresa */
  name: string;

  /** Documento da empresa (CNPJ ou CPF) */
  document: string;

  /** Tipo de documento */
  documentType: 'CNPJ' | 'CPF';

  /** Data de criação */
  createdAt: string; // ISO 8601
}
```

**Validations**:
- `document`:
  - CNPJ: 14 dígitos numéricos, checksum válido
  - CPF: 11 dígitos numéricos, checksum válido
- `name`: Mínimo 3 caracteres

**Relationships**:
- `1:N` com Operator
- `1:1` com Project (default)

---

### SipExtension

Configuração VoIP do operador.

```typescript
/**
 * Extensão SIP para realização de chamadas
 */
export interface SipExtension {
  /** ID único da extensão (UUID) */
  id: string;

  /** Número da extensão (ex: "1001") */
  extensionNumber: string;

  /** Endereço do servidor SIP */
  sipServer: string;

  /** Porta do servidor SIP */
  sipPort: number;

  /** Senha da extensão SIP (criptografada pelo backend) */
  encryptedPassword: string;

  /** Data de criação */
  createdAt: string; // ISO 8601
}
```

**Validations**:
- `extensionNumber`: Somente dígitos, 3-6 caracteres
- `sipServer`: Formato hostname ou IP válido
- `sipPort`: 1024-65535
- `encryptedPassword`: Nunca expor em logs ou UI

**Relationships**:
- `1:1` com Operator

**Security Notes**:
- `encryptedPassword` retornado pelo backend já criptografado
- Nunca armazenar senha desencriptada no client
- Nunca logar ou exibir em UI

---

### AuthSession

Sessão de autenticação ativa.

```typescript
/**
 * Sessão de autenticação ativa
 */
export interface AuthSession {
  /** JWT token do Supabase (access_token) */
  token: string;

  /** ID do usuário autenticado */
  userId: string;

  /** Contexto da empresa (CNPJ usado no login) */
  companyContext: string;

  /** URL para upload de chamadas */
  softphoneUploadUrl: string;

  /** Data de expiração do token */
  expiresAt: string; // ISO 8601

  /** Timestamp de criação da sessão */
  createdAt: number; // Unix timestamp
}
```

**Storage Location**: `chrome.storage.session`

**Lifecycle**:
1. Criada no login bem-sucedido
2. Validada no startup via GET /auth/profile
3. Removida em:
   - Logout explícito
   - 401 Unauthorized response
   - Browser close (chrome.storage.session auto-clear)

**Security Notes**:
- Token nunca deve ser logado
- Sempre enviar via Authorization header
- Clear imediatamente em logout

---

## Call Recording Entities

### CallRecording

Metadados e referência de áudio de uma chamada completada.

```typescript
/**
 * Gravação de chamada com metadados
 */
export interface CallRecording {
  /** ID único da gravação (UUID gerado no client) */
  id: string;

  /** Número do telefone que originou a chamada */
  caller: string;

  /** Número do telefone que recebeu a chamada */
  callee: string;

  /** Timestamp de início da chamada (ISO 8601) */
  startedAt: string;

  /** Duração da chamada em segundos */
  durationSeconds: number;

  /** Blob do arquivo de áudio (WebM Opus) */
  audioBlob: Blob;

  /** Tamanho do arquivo em bytes */
  audioSizeBytes: number;

  /** ID do projeto para analytics */
  projectId: string;

  /** ID do insight para analytics */
  insightId: string;

  /** Status do upload */
  uploadStatus: UploadStatus;

  /** Timestamp de criação */
  createdAt: number; // Unix timestamp
}

export type UploadStatus =
  | 'pending'    // Aguardando upload
  | 'uploading'  // Upload em progresso
  | 'completed'  // Upload bem-sucedido
  | 'failed'     // Upload falhou após retries
  | 'retrying';  // Retry em progresso
```

**Validations**:
- `caller`, `callee`: Formato internacional de telefone (E.164)
- `startedAt`: ISO 8601 timestamp válido
- `durationSeconds`: >= 0
- `audioBlob`: type `audio/webm`
- `audioSizeBytes`: <= 10MB (limite backend)

**Relationships**:
- `N:1` com Operator
- `N:1` com Project
- `N:1` com Insight

---

### UploadQueueItem

Item na fila de uploads pendentes.

```typescript
/**
 * Item na fila de uploads
 */
export interface UploadQueueItem {
  /** ID único do item (UUID) */
  id: string;

  /** ID da gravação de chamada */
  recordingId: string;

  /** ID do audio no IndexedDB */
  audioStorageId: string;

  /** Metadados da chamada para upload */
  metadata: {
    caller: string;
    callee: string;
    startedAt: string;
    durationSeconds: number;
    projectId: string;
    insightId: string;
  };

  /** Número de tentativas de upload realizadas */
  retryCount: number;

  /** Timestamp do próximo retry (Unix timestamp) */
  nextRetryAt: number;

  /** Status atual do upload */
  status: 'pending' | 'retrying' | 'failed';

  /** Mensagem de erro (se houver) */
  error?: string;

  /** Timestamp de criação do item */
  createdAt: number; // Unix timestamp

  /** Timestamp da última tentativa */
  lastAttemptAt?: number; // Unix timestamp
}
```

**Storage Location**: `chrome.storage.local` (JSON serializado)

**Audio Storage**: `IndexedDB` (referenciado por `audioStorageId`)

**Lifecycle**:
1. Criado após fim de chamada
2. Processado por background worker
3. Retry automático (max 3 tentativas) com exponential backoff
4. Removido após sucesso ou falha definitiva

**Retry Schedule**:
- Attempt 1: Immediate
- Attempt 2: +1s
- Attempt 3: +2s
- Attempt 4 (final): +4s

---

### UploadConfig

Configuração de upload recebida do backend.

```typescript
/**
 * Configuração de upload de chamadas
 */
export interface UploadConfig {
  /** URL do endpoint de upload */
  uploadUrl: string;

  /** ID do projeto padrão */
  projectId: string;

  /** ID do insight padrão */
  insightId: string;

  /** Timestamp de última atualização */
  updatedAt: number; // Unix timestamp
}
```

**Storage Location**: `chrome.storage.local`

**Source**: Retornado em:
- POST /auth/register (response)
- POST /auth/login (response)
- GET /auth/profile (response)

**Update Strategy**: Sempre sobrescrever com dados mais recentes do backend

---

## API Request/Response Types

### Registration

```typescript
/**
 * Request para registro de novo operador
 */
export interface RegisterRequest {
  /** Email do operador */
  email: string;

  /** Senha do operador (min 8 chars) */
  password: string;

  /** Nome completo */
  name: string;

  /** Nome da empresa */
  companyName: string;

  /** CNPJ ou CPF */
  document: string;

  /** Tipo de documento */
  documentType: 'CNPJ' | 'CPF';

  /** Configuração opcional de extensão SIP */
  extension?: {
    extensionNumber: string;
    sipServer: string;
    sipPort: number;
    sipPassword: string;
  };
}

/**
 * Response de registro bem-sucedido
 */
export interface RegisterResponse {
  /** Mensagem de sucesso */
  message: string;

  /** ID do projeto padrão criado */
  defaultProjectId: string;

  /** ID do insight padrão criado */
  defaultInsightId: string;

  /** URL para upload de chamadas */
  softphoneUploadUrl: string;
}
```

---

### Login

```typescript
/**
 * Request para login
 */
export interface LoginRequest {
  /** Email do operador */
  email: string;

  /** Senha */
  password: string;

  /** CNPJ da empresa (multi-tenant) */
  cnpj: string;
}

/**
 * Response de login bem-sucedido
 */
export interface LoginResponse {
  /** JWT token do Supabase */
  access_token: string;

  /** Dados do operador */
  user: Operator;

  /** ID do projeto padrão */
  defaultProjectId: string;

  /** ID do insight padrão */
  defaultInsightId: string;

  /** URL para upload de chamadas */
  softphoneUploadUrl: string;
}
```

---

### Profile

```typescript
/**
 * Response de GET /auth/profile
 */
export interface ProfileResponse {
  /** Dados do operador */
  user: Operator;

  /** ID do projeto padrão */
  defaultProjectId: string;

  /** ID do insight padrão */
  defaultInsightId: string;

  /** URL para upload de chamadas */
  softphoneUploadUrl: string;
}
```

---

### Password Management

```typescript
/**
 * Request para troca de senha
 */
export interface ChangePasswordRequest {
  /** Senha atual (para validação) */
  currentPassword: string;

  /** Nova senha */
  newPassword: string;
}

/**
 * Request para solicitar reset de senha
 */
export interface ForgotPasswordRequest {
  /** Email da conta */
  email: string;
}

/**
 * Request para confirmar reset de senha
 */
export interface ResetPasswordRequest {
  /** Token recebido por email */
  access_token: string;

  /** Nova senha */
  newPassword: string;
}
```

---

### Email Confirmation

```typescript
/**
 * Request para confirmação de email
 */
export interface ConfirmEmailRequest {
  /** Token recebido no link do email */
  access_token: string;
}

/**
 * Request para reenvio de email de confirmação
 */
export interface ResendConfirmationRequest {
  /** Email da conta */
  email: string;
}
```

---

### Call Upload

```typescript
/**
 * Payload para upload de chamada
 * (Enviado como multipart/form-data)
 */
export interface UploadCallPayload {
  /** Arquivo de áudio (File/Blob) */
  audio: File | Blob;

  /** Metadados JSON */
  metadata: {
    caller: string;
    callee: string;
    startedAt: string; // ISO 8601
    durationSeconds: number;
    projectId: string;
    insightId: string;
  };
}

/**
 * Response de upload bem-sucedido
 */
export interface UploadCallResponse {
  /** ID da gravação criada no backend */
  recordingId: string;

  /** Mensagem de sucesso */
  message: string;
}
```

---

## Validation Schemas

### CNPJ Validation

```typescript
/**
 * Valida CNPJ (14 dígitos com checksum)
 */
export function isValidCNPJ(cnpj: string): boolean {
  // Remove non-digits
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;

  // Calculate first check digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const check1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  // Calculate second check digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const check2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  // Validate
  return (
    parseInt(digits[12]) === check1 &&
    parseInt(digits[13]) === check2
  );
}
```

### Email Validation

```typescript
/**
 * Valida formato de email (RFC 5322 simplificado)
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

### Phone Number Validation

```typescript
import { PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Valida número de telefone internacional
 */
export function isValidPhoneNumber(phone: string, country: string = 'BR'): boolean {
  try {
    const number = phoneUtil.parse(phone, country);
    return phoneUtil.isValidNumber(number);
  } catch {
    return false;
  }
}

/**
 * Formata número de telefone para E.164
 */
export function formatPhoneE164(phone: string, country: string = 'BR'): string {
  const number = phoneUtil.parse(phone, country);
  return phoneUtil.format(number, PhoneNumberFormat.E164);
}
```

---

## Storage Schema

### chrome.storage.session

```typescript
interface SessionStorage {
  /** JWT token */
  auth_token: string;

  /** ID do usuário */
  user_id: string;

  /** Contexto da empresa */
  company_context: string;

  /** Timestamp de expiração */
  token_expires_at: string; // ISO 8601
}
```

**Lifetime**: Cleared on browser close

---

### chrome.storage.local

```typescript
interface LocalStorage {
  /** Configuração de upload */
  upload_config: {
    uploadUrl: string;
    projectId: string;
    insightId: string;
    updatedAt: number;
  };

  /** Fila de uploads */
  upload_queue: UploadQueueItem[];

  /** Configurações da extensão */
  settings: {
    // ... (configurações existentes do projeto)
  };
}
```

**Lifetime**: Persists across browser restarts

---

### IndexedDB Schema

```typescript
/**
 * Database: scany-softphone
 * Version: 1
 */

// Object Store: audios
interface AudioRecord {
  /** Chave primária */
  id: string; // UUID

  /** Blob do áudio */
  blob: Blob;

  /** Timestamp de criação */
  createdAt: number; // Unix timestamp
}
```

**Usage**: Store audio blobs separately from queue metadata to avoid chrome.storage size limits

---

## Error Types

```typescript
/**
 * Erro de API
 */
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

/**
 * Erro de rede
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Erro de validação
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Classificação de erro retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}
```

---

## Constants

```typescript
/**
 * API Base URL
 */
export const API_BASE_URL = 'https://api.stage.scany.com.br/api/v1';

/**
 * Limites de retry
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 4000
} as const;

/**
 * Limites de upload
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  SUPPORTED_FORMATS: ['audio/webm', 'audio/wav'] as const
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  SESSION: {
    AUTH_TOKEN: 'auth_token',
    USER_ID: 'user_id',
    COMPANY_CONTEXT: 'company_context',
    TOKEN_EXPIRES_AT: 'token_expires_at'
  },
  LOCAL: {
    UPLOAD_CONFIG: 'upload_config',
    UPLOAD_QUEUE: 'upload_queue',
    SETTINGS: 'settings'
  }
} as const;
```

---

## State Machine Diagrams

### Upload State Machine

```
┌─────────┐
│ pending │──────upload_success─────┐
└────┬────┘                          │
     │                               ▼
     │                         ┌───────────┐
     │                         │ completed │
     │                         └───────────┘
     │
     └─────upload_attempt────► ┌───────────┐
                               │ retrying  │
                               └─────┬─────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              retry_success    max_retries      retry_attempt
                    │                │                │
                    ▼                ▼                │
              ┌─────────┐      ┌────────┐            │
              │ pending │      │ failed │◄───────────┘
              └─────────┘      └────────┘
```

### Authentication State Machine

```
┌─────────────┐
│ unauthenticated │
└────────┬────────┘
         │
         │ login_success
         │
         ▼
┌─────────────┐
│ authenticated │
└────────┬──────┘
         │
         ├─────────token_expired────────┐
         │                               │
         │ logout                        │
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────┐
    │ logging_out │              │ token_invalid │
    └──────┬──────┘              └──────┬───────┘
           │                            │
           └─────────┬──────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ unauthenticated │
              └─────────────┘
```

---

**Status**: ✅ Data Model Complete
**Next**: Contracts (auth-api.yaml, upload-api.yaml)
