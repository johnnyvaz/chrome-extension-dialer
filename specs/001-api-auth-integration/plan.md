# Implementation Plan: API Authentication Integration

**Branch**: `001-api-auth-integration` | **Date**: 2025-10-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-api-auth-integration/spec.md`

## Summary

Implementar sistema completo de autenticação e onboarding automático para extensão Chrome do softphone, integrando com a API Scany. O sistema incluirá registro de operadores, confirmação de email, login com configuração automática de extensão SIP, gerenciamento de perfil, mudança de senha, reset de senha e upload automático de gravações de chamadas. A autenticação usa tokens JWT do Supabase e o backend cria automaticamente projeto e insight padrão para analytics durante o registro. Todas as chamadas realizadas terão áudio e metadados enviados automaticamente para o endpoint de upload do softphone.

## Technical Context

**Language/Version**: TypeScript 4.x+ (React 18.2.0)
**Primary Dependencies**: React, Chakra UI, JsSIP (WebRTC), google-libphonenumber, chrome extension APIs
**Storage**: chrome.storage.session (JWT token, upload config), chrome.storage.local (upload queue, settings)
**Testing**: Jest, @testing-library/react, @testing-library/user-event
**Target Platform**: Chrome Extension (Manifest V3), Edge Chromium compatible
**Project Type**: Chrome Extension (window popup + background service worker)
**Performance Goals**: Login < 2s, Upload complete < 30s após fim de chamada, Token validation < 1s no startup
**Constraints**:
- Extension popup lifecycle (pode fechar frequentemente, persistir estado)
- Chrome storage limits (session: ~10MB, local: ~10MB sync)
- Network reliability (retry strategy required)
- Audio file size limits (típico 1-5MB por chamada)
**Scale/Scope**:
- ~50 operadores concorrentes por empresa
- ~100 chamadas/dia por operador
- Taxa de upload: 1 arquivo por chamada completada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: Constituição não customizada (usando template padrão). Sem gates específicos definidos. Aplicando princípios gerais:

- ✅ **Modularização**: Separar serviços de autenticação (AuthService) e upload (UploadService) como módulos independentes
- ✅ **Testabilidade**: Interfaces testáveis via mocks de chrome.storage e fetch
- ✅ **Observabilidade**: Logs estruturados para diagnóstico (sem dados sensíveis)
- ✅ **Simplicidade**: Usar padrões REST diretos, sem frameworks complexos de estado

**Re-avaliação Pós-Design**: Pendente (após Phase 1)

## Project Structure

### Documentation (this feature)

```
specs/001-api-auth-integration/
├── plan.md              # Este arquivo
├── research.md          # Phase 0: Decisões técnicas e padrões
├── data-model.md        # Phase 1: Modelo de dados e entidades
├── quickstart.md        # Phase 1: Guia de desenvolvimento
├── contracts/           # Phase 1: Contratos de API
│   ├── auth-api.yaml    # OpenAPI spec para endpoints de autenticação
│   └── upload-api.yaml  # OpenAPI spec para endpoint de upload
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Phase 2: Tarefas de implementação (gerado por /speckit.tasks)
```

### Source Code (repository root)

```
src/
├── api/                      # Clientes HTTP para API backend
│   ├── index.ts              # Re-exports
│   ├── types.ts              # Tipos de request/response
│   ├── constants.ts          # URLs e configurações
│   ├── authApi.ts            # NOVO: Cliente para endpoints de autenticação
│   └── uploadApi.ts          # NOVO: Cliente para endpoint de upload
│
├── services/                 # Serviços de negócio
│   ├── auditoriaService.ts   # EXISTENTE: Será refatorado para usar novo uploadApi
│   ├── authService.ts        # NOVO: Gerenciamento de autenticação e sessão
│   └── uploadService.ts      # NOVO: Fila de upload com retry
│
├── storage/                  # Camada de persistência
│   ├── index.ts              # EXISTENTE: Será expandido
│   ├── authStorage.ts        # NOVO: Persistência de token e config de upload
│   └── uploadQueue.ts        # NOVO: Persistência de fila de uploads pendentes
│
├── window/                   # UI React (popup da extensão)
│   ├── auth/                 # NOVO: Componentes de autenticação
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── EmailConfirmation.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ResetPassword.tsx
│   │   └── ChangePassword.tsx
│   │
│   ├── phone/                # EXISTENTE: Será expandido
│   │   ├── index.tsx         # Adicionar indicador de upload status
│   │   └── DialPad.tsx       # Integrar com authService
│   │
│   ├── settings/             # EXISTENTE: Será expandido
│   │   ├── index.tsx         # Adicionar seção de perfil
│   │   └── Profile.tsx       # NOVO: Visualização de perfil do operador
│   │
│   └── App.tsx               # EXISTENTE: Adicionar rotas de autenticação
│
├── background/               # Background service worker
│   └── index.ts              # EXISTENTE: Adicionar listeners para eventos de upload
│
├── lib/                      # Biblioteca SIP/WebRTC
│   ├── SipUA.ts              # EXISTENTE: Integrar com authService
│   ├── SipSession.ts         # EXISTENTE: Adicionar hooks de gravação
│   └── SipAudioElements.ts   # EXISTENTE: Integrar gravação para upload
│
├── common/                   # Tipos e constantes compartilhados
│   ├── types.ts              # EXISTENTE: Adicionar tipos de autenticação
│   └── constants.ts          # EXISTENTE: Adicionar constantes de API
│
└── utils/                    # Utilitários
    ├── index.ts
    ├── validation.ts         # NOVO: Validação de CNPJ, email, senha
    └── retry.ts              # NOVO: Lógica de exponential backoff

tests/
├── unit/
│   ├── services/
│   │   ├── authService.test.ts
│   │   └── uploadService.test.ts
│   ├── storage/
│   │   ├── authStorage.test.ts
│   │   └── uploadQueue.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── retry.test.ts
│
└── integration/
    ├── auth-flow.test.ts     # Fluxo completo de autenticação
    └── upload-flow.test.ts   # Fluxo completo de upload com retry
```

**Structure Decision**:

O projeto segue arquitetura de Chrome Extension com separação clara entre:

1. **Camada de API** (`src/api/`): Clientes HTTP tipados para comunicação com backend
2. **Camada de Serviço** (`src/services/`): Lógica de negócio (autenticação, upload, retry)
3. **Camada de Persistência** (`src/storage/`): Abstração sobre chrome.storage APIs
4. **Camada de UI** (`src/window/`): Componentes React com Chakra UI
5. **Background Worker** (`src/background/`): Service worker para operações em background
6. **Biblioteca SIP** (`src/lib/`): Integração WebRTC/JsSIP existente

Esta estrutura mantém compatibilidade com a arquitetura existente enquanto adiciona novos módulos isolados para autenticação e upload.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

Sem violações identificadas. Arquitetura segue princípios de simplicidade e modularização.

---

## Phase 0: Research & Decisions

### Research Topics

1. **Chrome Extension Storage Strategy**
   - chrome.storage.session vs chrome.storage.local para diferentes tipos de dados
   - Limites de armazenamento e estratégias de compactação
   - Sincronização entre popup e background worker

2. **Retry Strategy for API Calls**
   - Exponential backoff implementation
   - Diferenciação entre erros retryable (network, 500) vs non-retryable (400, 401)
   - Queue persistence across extension restarts

3. **Audio Recording for Upload**
   - Integração com JsSIP para capturar stream de áudio
   - Formatos de áudio suportados pelo browser (WebM, WAV, MP3)
   - Conversão e compactação se necessário

4. **Authentication Token Management**
   - Lifecycle de JWT Supabase token
   - Token validation no startup
   - Silent refresh vs logout em token expirado

5. **Form Validation**
   - Validação de CNPJ (14 dígitos, formato)
   - Validação de email (RFC 5322)
   - Validação de senha (requisitos do backend)
   - Validação de número de telefone (google-libphonenumber)

6. **Error Handling Patterns**
   - User-friendly error messages em português
   - Network error vs API error vs validation error
   - Retry automático vs manual para diferentes contextos

### Technical Decisions to Document

- Estratégia de roteamento para fluxos de autenticação (React Router vs state-based)
- Padrão de gerenciamento de estado (Context API vs Zustand vs Redux)
- Formato de armazenamento de upload queue (JSON serializado)
- Integração entre popup lifecycle e background worker para uploads longos

**Output**: `research.md` com decisões documentadas e alternativas consideradas

---

## Phase 1: Design Artifacts

### 1. Data Model (`data-model.md`)

Entidades principais a documentar:

- **AuthSession**: JWT token, user ID, company context, upload URLs
- **Operator**: ID, email, name, role, company, extension config, project/insight IDs
- **SipExtension**: Extension number, server, port, encrypted password
- **CallRecording**: Caller, callee, timestamps, duration, audio blob, metadata
- **UploadQueueItem**: Recording reference, retry count, next retry time, status
- **UploadConfig**: Project ID, Insight ID, upload URL

Relacionamentos e validações conforme especificação.

### 2. API Contracts (`contracts/`)

**auth-api.yaml**: OpenAPI 3.0 spec para:
- POST /auth/register
- POST /auth/confirm-email
- POST /auth/confirm-email/resend
- POST /auth/login
- GET /auth/profile
- POST /auth/change-password
- POST /auth/reset-password
- POST /auth/reset-password/confirm
- POST /auth/logout

**upload-api.yaml**: OpenAPI 3.0 spec para:
- POST /softphone/uploads (multipart/form-data com audio file + JSON metadata)

### 3. Quickstart Guide (`quickstart.md`)

Guia para desenvolvedores com:
- Setup do ambiente de desenvolvimento
- Como testar autenticação localmente
- Como simular uploads de áudio
- Como rodar testes
- Como fazer build da extensão
- Como carregar extensão no Chrome para testes

### 4. Agent Context Update

Rodar `.specify/scripts/bash/update-agent-context.sh claude` para adicionar:
- TypeScript como linguagem principal
- React + Chakra UI para UI
- Chrome Extension APIs
- JsSIP para WebRTC
- Padrões de autenticação JWT
- Padrões de retry com exponential backoff

**Output**: `data-model.md`, `contracts/*.yaml`, `quickstart.md`, atualização de `.claude/context.md`

---

## Next Steps

Após completar Phase 1, executar:

```bash
/speckit.tasks
```

Para gerar `tasks.md` com decomposição detalhada de tarefas de implementação priorizadas e sequenciadas.

---

**Status**: ✅ Plan template preenchido. Pronto para Phase 0 (Research).
