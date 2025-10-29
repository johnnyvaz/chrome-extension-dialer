# Implementation Tasks: API Authentication Integration

**Feature**: API Authentication Integration
**Branch**: `001-api-auth-integration`
**Date**: 2025-10-16
**Generated From**: spec.md, plan.md, data-model.md, contracts/, research.md

## Overview

Este documento contém a decomposição completa de tarefas para implementação do sistema de autenticação e upload de chamadas. As tarefas estão organizadas por User Story (prioridade P1 → P2 → P3) para permitir implementação e testes independentes.

**Total Tasks**: 87
**MVP Scope**: User Stories 1, 2, 3 (Authentication Core + Upload)

---

## Implementation Strategy

### MVP First Approach

**MVP = User Stories 1, 2, 3** (P1):

- US1: Operator Registration → Permite criar contas
- US2: Email Confirmation → Valida contas
- US3: Login + SIP Config → Acesso ao softphone
- US7: Call Upload → Core business value

**Post-MVP** (P2):

- US4: Profile Management
- US5: Password Change
- US6: Password Reset

**Polish** (P3):

- US8: Secure Logout

### Independent Testing

Cada User Story pode ser testado independentemente:

- **US1**: Registrar → Verificar email enviado
- **US2**: Confirmar → Account ativado
- **US3**: Login → Token válido + SIP configurado
- **US7**: Upload → Áudio no backend

---

## Dependency Graph

### Story Completion Order

```
Phase 1: Setup
└──> Phase 2: Foundational
     └──> Phase 3: US1 (Registration) ────┐
          ├──> Phase 4: US2 (Confirmation) │
          │    └──> Phase 5: US3 (Login)───┤
          │         └──> Phase 6: US7 (Upload)
          │              └──> Phase 7: US4 (Profile)
          │                   ├──> Phase 8: US5 (Password Change)
          │                   └──> Phase 9: US6 (Password Reset)
          │                        └──> Phase 10: US8 (Logout)
          └──────────────────────────────────┘
                                             │
                                  Phase 11: Polish
```

**Dependencies**:

- US2 depends on US1 (email confirmation needs registration)
- US3 depends on US2 (login needs confirmed email)
- US7 depends on US3 (upload needs authenticated session)
- US4, US5, US6, US8 depend on US3 (need authenticated session)
- US5, US6 independent of each other (can parallelize)

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize project structure and shared utilities

### Tasks

- [x] T001 Create API client base structure in `src/api/index.ts` with common headers and error handling
- [x] T002 Create constants file in `src/api/constants.ts` with API_BASE_URL and endpoints
- [x] T003 Create error types in `src/common/types.ts` (ApiError, NetworkError, ValidationError classes)
- [x] T004 [P] Create retry utility with exponential backoff in `src/utils/retry.ts`
- [x] T005 [P] Create CNPJ validation function in `src/utils/validation.ts`
- [x] T006 [P] Create email validation function in `src/utils/validation.ts`
- [x] T007 [P] Create phone number validation function in `src/utils/validation.ts`
- [x] T008 Create storage keys constants in `src/common/constants.ts` (STORAGE_KEYS object)
- [x] T009 Initialize IndexedDB for audio storage in `src/storage/audioStorage.ts`
- [x] T010 Create error message mapping in `src/common/constants.ts` (ERROR_MESSAGES object in Portuguese)

---

## Phase 2: Foundational - Storage & Context

**Goal**: Create foundational storage and authentication context needed by all user stories

**Blocks**: All user story implementations

### Tasks

- [x] T011 Implement auth storage layer in `src/storage/authStorage.ts` (saveToken, getToken, clearToken for chrome.storage.session)
- [x] T012 Implement upload config storage in `src/storage/authStorage.ts` (saveUploadConfig, getUploadConfig for chrome.storage.local)
- [x] T013 Create AuthContext provider in `src/window/auth/AuthContext.tsx` with state (isAuthenticated, user, uploadConfig)
- [x] T014 Add AuthContext.Provider to `src/window/App.tsx` wrapping entire app
- [x] T015 Create useAuth hook in `src/window/auth/AuthContext.tsx` for consuming context
- [x] T016 Implement conditional rendering in `src/window/App.tsx` (show auth screens vs main app based on isAuthenticated)

---

## Phase 3: User Story 1 - Operator Registration (Priority P1)

**Story Goal**: New operators can create accounts with company details and optional SIP extension

**Independent Test**: Register with valid data → Verify account created + confirmation email sent

**Success Criteria**:

- Form validates CNPJ format (14 digits)
- Form validates email format
- Success message displayed with email instructions
- Optional SIP fields work correctly

### Tasks

#### Data Layer

- [x] T017 [P] [US1] Create RegisterRequest type in `src/api/types.ts`
- [x] T018 [P] [US1] Create RegisterResponse type in `src/api/types.ts`
- [x] T019 [P] [US1] Create Operator interface in `src/common/types.ts`
- [x] T020 [P] [US1] Create Company interface in `src/common/types.ts`
- [x] T021 [P] [US1] Create SipExtension interface in `src/common/types.ts`

#### API Client

- [x] T022 [US1] Implement register API function in `src/api/authApi.ts` (POST /auth/register)
- [x] T023 [US1] Add error handling for 400 (validation), 409 (conflict), 500 in register function

#### UI Components

- [x] T024 [US1] Create RegisterForm component in `src/window/auth/RegisterForm.tsx` with Chakra UI
- [x] T025 [US1] Add form fields in RegisterForm: email, password, name, companyName, document (CNPJ/CPF)
- [x] T026 [US1] Add optional SIP fields section in RegisterForm (collapsible): extensionNumber, sipServer, sipPort, sipPassword
- [x] T027 [US1] Integrate Yup validation schema in RegisterForm with CNPJ/email validators
- [x] T028 [US1] Implement form submission handler in RegisterForm calling authApi.register()
- [x] T029 [US1] Display success message in RegisterForm with "Verifique seu email" instruction
- [x] T030 [US1] Display validation errors from backend in RegisterForm (field-specific messages)
- [x] T031 [US1] Add loading state and disable submit button during registration in RegisterForm

#### Integration

- [x] T032 [US1] Add RegisterForm to auth view routing in `src/window/App.tsx`
- [x] T033 [US1] Add "Criar Conta" link from LoginForm to RegisterForm navigation

---

## Phase 4: User Story 2 - Email Confirmation (Priority P1)

**Story Goal**: Operators must confirm email address before login

**Independent Test**: Click confirmation link → Account status changes to confirmed

**Success Criteria**:

- Confirmation link successfully activates account
- Resend confirmation works with rate limiting
- Expired token shows error with resend option
- Idempotent behavior (multiple clicks OK)

### Tasks

#### Data Layer

- [x] T034 [P] [US2] Create ConfirmEmailRequest type in `src/api/types.ts`
- [x] T035 [P] [US2] Create ResendConfirmationRequest type in `src/api/types.ts`

#### API Client

- [x] T036 [US2] Implement confirmEmail API function in `src/api/authApi.ts` (POST /auth/confirm-email)
- [x] T037 [US2] Implement resendConfirmation API function in `src/api/authApi.ts` (POST /auth/confirm-email/resend)
- [x] T038 [US2] Add error handling for 400, 404, 429 in confirmEmail function

#### UI Components

- [x] T039 [US2] Create EmailConfirmation component in `src/window/auth/EmailConfirmation.tsx`
- [x] T040 [US2] Extract access_token from URL query parameters in EmailConfirmation component
- [x] T041 [US2] Auto-submit confirmation on component mount in EmailConfirmation
- [x] T042 [US2] Display success message and redirect to login after confirmation
- [x] T043 [US2] Display error message for expired/invalid tokens with resend button
- [x] T044 [US2] Implement resend confirmation handler with email input in EmailConfirmation
- [x] T045 [US2] Handle 429 rate limit error with cooldown message in EmailConfirmation

#### Integration

- [x] T046 [US2] Add EmailConfirmation to auth view routing in `src/window/App.tsx`
- [x] T047 [US2] Add "Reenviar email de confirmação" link in LoginForm for unconfirmed users

---

## Phase 5: User Story 3 - Login with Auto SIP Configuration (Priority P1)

**Story Goal**: Authenticated operators access softphone with automatic SIP setup

**Independent Test**: Login with valid credentials → Token stored + SIP extension configured

**Success Criteria**:

- JWT token stored in chrome.storage.session
- SIP extension auto-configured from response
- Rate limiting enforced (5 attempts per 15 min)
- Multi-company login works (CNPJ selector)
- Profile validated on startup

### Tasks

#### Data Layer

- [x] T048 [P] [US3] Create LoginRequest type in `src/api/types.ts`
- [x] T049 [P] [US3] Create LoginResponse type in `src/api/types.ts`
- [x] T050 [P] [US3] Create ProfileResponse type in `src/api/types.ts`
- [x] T051 [P] [US3] Create AuthSession interface in `src/common/types.ts`

#### API Client

- [x] T052 [US3] Implement login API function in `src/api/authApi.ts` (POST /auth/login)
- [x] T053 [US3] Implement getProfile API function in `src/api/authApi.ts` (GET /auth/profile with Authorization header)
- [x] T054 [US3] Add error handling for 401, 429 in login function

#### Service Layer

- [x] T055 [US3] Create AuthService class in `src/services/authService.ts`
- [x] T056 [US3] Implement AuthService.login() method: call API + store token + store upload config + update context
- [x] T057 [US3] Implement AuthService.init() method: load token + validate with getProfile + handle 401 silent logout
- [x] T058 [US3] Implement AuthService.silentLogout() method: clear storage + update context
- [x] T059 [US3] Implement SIP configuration in AuthService.login(): extract extension data from response + configure SipUA

#### UI Components

- [x] T060 [US3] Create LoginForm component in `src/window/auth/LoginForm.tsx` with Chakra UI
- [x] T061 [US3] Add form fields in LoginForm: email, password, CNPJ
- [x] T062 [US3] Integrate validation in LoginForm (email format, CNPJ format)
- [x] T063 [US3] Implement form submission handler in LoginForm calling AuthService.login()
- [x] T064 [US3] Display loading state during login in LoginForm
- [x] T065 [US3] Display error messages in LoginForm (invalid credentials, rate limit, unconfirmed email)
- [x] T066 [US3] Add "Esqueci minha senha" link in LoginForm
- [x] T067 [US3] Add "Criar conta" link in LoginForm

#### Integration

- [x] T068 [US3] Call AuthService.init() in App.tsx useEffect on mount
- [x] T069 [US3] Integrate with existing SipUA in `src/lib/SipUA.ts`: use extension data from AuthService
- [x] T070 [US3] Add 401 response interceptor globally to trigger silentLogout

---

## Phase 6: User Story 7 - Call Upload (Priority P1)

**Story Goal**: Completed calls automatically upload audio + metadata to backend

**Independent Test**: Complete call → Audio file + metadata uploaded successfully

**Success Criteria**:

- Audio recorded in WebM Opus format
- Metadata includes all required fields (caller, callee, timestamps, duration)
- Retry queue handles network failures (3 attempts with backoff)
- Upload happens in background worker
- Failed uploads persist across restarts

### Tasks

#### Data Layer

- [x] T071 [P] [US7] Create CallRecording interface in `src/common/types.ts`
- [x] T072 [P] [US7] Create UploadQueueItem interface in `src/common/types.ts`
- [x] T073 [P] [US7] Create UploadConfig interface in `src/common/types.ts`
- [x] T074 [P] [US7] Create UploadCallPayload type in `src/api/types.ts`
- [x] T075 [P] [US7] Create UploadCallResponse type in `src/api/types.ts`

#### API Client

- [x] T076 [US7] Implement uploadCall API function in `src/api/uploadApi.ts` (POST /softphone/uploads with multipart/form-data)
- [x] T077 [US7] Add Authorization header (Bearer token) in uploadCall function
- [x] T078 [US7] Add error handling for 400, 401, 429, 500 in uploadCall function

#### Storage Layer

- [x] T079 [US7] Implement upload queue storage in `src/storage/uploadQueue.ts` (save/load queue from chrome.storage.local)
- [x] T080 [US7] Implement audio storage in `src/storage/audioStorage.ts` (save/load audio blobs in IndexedDB)

#### Service Layer

- [x] T081 [US7] Create UploadService class in `src/services/uploadService.ts`
- [x] T082 [US7] Implement UploadService.enqueue() method: save recording to IndexedDB + add to queue
- [x] T083 [US7] Implement UploadService.processNext() method: get pending item + retry logic with exponential backoff
- [x] T084 [US7] Implement UploadService.upload() method: load audio from IndexedDB + call uploadApi + handle errors
- [x] T085 [US7] Add retry logic in processNext: max 3 attempts, backoff (1s, 2s, 4s), mark failed after max retries

#### Recording Integration

- [x] T086 [US7] Add recording start in `src/lib/SipSession.ts`: capture MediaRecorder from RTCPeerConnection
- [x] T087 [US7] Configure MediaRecorder in SipSession: WebM Opus codec, 32kbps bitrate
- [x] T088 [US7] Add recording stop in SipSession: get audio blob on call end
- [x] T089 [US7] Trigger UploadService.enqueue() in SipSession on call end with recording data

#### Background Worker

- [x] T090 [US7] Create background worker listener in `src/background/index.ts` for PROCESS_UPLOAD_QUEUE message
- [x] T091 [US7] Create chrome.alarms schedule in background worker: PROCESS_UPLOAD_QUEUE every 30 seconds
- [x] T092 [US7] Implement queue processing loop in background worker: call UploadService.processNext() until empty
- [x] T093 [US7] Add alarm listener in background worker to trigger queue processing

#### UI Indicators

- [x] T094 [US7] Add upload status indicator in `src/window/phone/index.tsx`: show pending/uploading/failed counts
- [x] T095 [US7] Display manual retry button in phone UI when failed uploads exist
- [x] T096 [US7] Handle missing extension warning in phone UI: show banner when extension data null in login response

---

## Phase 7: User Story 4 - Profile Management (Priority P2)

**Story Goal**: Operators view profile information and validate session on startup

**Independent Test**: Login → Access profile → See user data + extension details

**Success Criteria**:

- Profile shows all operator data (name, email, role, company)
- Extension details visible (number, server, port)
- Password never displayed
- Session validated on app startup

### Tasks

#### UI Components

- [ ] T097 [US4] Create Profile component in `src/window/settings/Profile.tsx` with Chakra UI
- [ ] T098 [US4] Display operator data in Profile: name, email, role, company name, CNPJ
- [ ] T099 [US4] Display extension data in Profile: extension number, SIP server, SIP port
- [ ] T100 [US4] Add visual indicator for no extension configured in Profile
- [ ] T101 [US4] Add "Configurar Extensão" link in Profile when extension is null

#### Integration

- [ ] T102 [US4] Add Profile component to settings tab in `src/window/settings/index.tsx`
- [ ] T103 [US4] Fetch profile on settings tab mount using getProfile API

---

## Phase 8: User Story 5 - Password Change (Priority P2)

**Story Goal**: Authenticated operators change password while logged in

**Independent Test**: Login → Change password → Logout + Login with new password succeeds

**Success Criteria**:

- Current password validated before change
- New password meets requirements
- Success confirmation displayed
- Session remains valid after change

### Tasks

#### Data Layer

- [ ] T104 [P] [US5] Create ChangePasswordRequest type in `src/api/types.ts`

#### API Client

- [ ] T105 [US5] Implement changePassword API function in `src/api/authApi.ts` (POST /auth/change-password with Authorization header)
- [ ] T106 [US5] Add error handling for 400, 401 in changePassword function

#### UI Components

- [ ] T107 [US5] Create ChangePassword component in `src/window/auth/ChangePassword.tsx` with Chakra UI
- [ ] T108 [US5] Add form fields in ChangePassword: currentPassword, newPassword, confirmNewPassword
- [ ] T109 [US5] Add password strength indicator in ChangePassword for new password field
- [ ] T110 [US5] Integrate validation in ChangePassword (min 8 chars, has uppercase, has number)
- [ ] T111 [US5] Implement form submission handler calling changePassword API
- [ ] T112 [US5] Display success message in ChangePassword
- [ ] T113 [US5] Display error for incorrect current password in ChangePassword

#### Integration

- [ ] T114 [US5] Add ChangePassword component to settings tab in `src/window/settings/index.tsx`
- [ ] T115 [US5] Add "Alterar Senha" button in Profile component linking to ChangePassword

---

## Phase 9: User Story 6 - Password Reset (Priority P2)

**Story Goal**: Operators who forgot password can reset via email

**Independent Test**: Request reset → Click email link → Set new password → Login succeeds

**Success Criteria**:

- Reset email sent (generic message for security)
- Reset link validates token
- Expired token shows error with retry option
- 1-minute cooldown on reset requests

### Tasks

#### Data Layer

- [ ] T116 [P] [US6] Create ForgotPasswordRequest type in `src/api/types.ts`
- [ ] T117 [P] [US6] Create ResetPasswordRequest type in `src/api/types.ts`

#### API Client

- [ ] T118 [US6] Implement forgotPassword API function in `src/api/authApi.ts` (POST /auth/reset-password)
- [ ] T119 [US6] Implement resetPassword API function in `src/api/authApi.ts` (POST /auth/reset-password/confirm)
- [ ] T120 [US6] Add error handling for 400, 404, 429 in both functions

#### UI Components

- [ ] T121 [US6] Create ForgotPassword component in `src/window/auth/ForgotPassword.tsx` with Chakra UI
- [ ] T122 [US6] Add email input field in ForgotPassword
- [ ] T123 [US6] Implement form submission calling forgotPassword API
- [ ] T124 [US6] Display generic success message in ForgotPassword (security: don't reveal if account exists)
- [ ] T125 [US6] Handle 429 rate limit with cooldown message in ForgotPassword
- [ ] T126 [US6] Create ResetPassword component in `src/window/auth/ResetPassword.tsx` with Chakra UI
- [ ] T127 [US6] Extract access_token from URL in ResetPassword component
- [ ] T128 [US6] Add newPassword and confirmPassword fields in ResetPassword
- [ ] T129 [US6] Integrate password validation in ResetPassword
- [ ] T130 [US6] Implement form submission calling resetPassword API with token
- [ ] T131 [US6] Display success message and redirect to login in ResetPassword
- [ ] T132 [US6] Display error for expired/invalid tokens in ResetPassword

#### Integration

- [ ] T133 [US6] Add ForgotPassword to auth view routing in `src/window/App.tsx`
- [ ] T134 [US6] Add ResetPassword to auth view routing in `src/window/App.tsx`
- [ ] T135 [US6] Link "Esqueci minha senha" in LoginForm to ForgotPassword component

---

## Phase 10: User Story 8 - Secure Logout (Priority P3)

**Story Goal**: Operators log out cleanly, invalidating session and clearing data

**Independent Test**: Login → Logout → Verify token removed + cannot access protected features

**Success Criteria**:

- Server session terminated
- Local token cleared
- SIP configuration cleared
- Redirect to login screen

### Tasks

#### API Client

- [ ] T136 [US8] Implement logout API function in `src/api/authApi.ts` (POST /auth/logout with userId)

#### Service Layer

- [ ] T137 [US8] Implement AuthService.logout() method: call logout API + clear storage + clear SIP config + update context

#### UI Components

- [ ] T138 [US8] Add Logout button in settings tab in `src/window/settings/index.tsx`
- [ ] T139 [US8] Add confirmation modal for logout action
- [ ] T140 [US8] Implement logout handler calling AuthService.logout()
- [ ] T141 [US8] Redirect to login screen after logout completes

---

## Phase 11: Polish & Cross-Cutting Concerns

**Goal**: Improve UX, add missing integrations, handle edge cases

### Tasks

#### Error Handling

- [ ] T142 [P] Create global error boundary in `src/window/ErrorBoundary.tsx` with Chakra UI error display
- [ ] T143 [P] Wrap App.tsx content in ErrorBoundary component
- [ ] T144 [P] Add toast notifications for all API errors (use Chakra UI toast)
- [ ] T145 [P] Implement Portuguese error messages for all error codes

#### Loading States

- [ ] T146 [P] Add loading spinner component in `src/window/common/LoadingSpinner.tsx`
- [ ] T147 [P] Add loading overlay for all async operations in auth forms
- [ ] T148 [P] Add skeleton loaders for profile data loading

#### Validation Improvements

- [ ] T149 [P] Add real-time CNPJ validation feedback in registration form
- [ ] T150 [P] Add password strength meter component in `src/window/auth/PasswordStrength.tsx`
- [ ] T151 [P] Integrate password strength meter in all password input fields

#### SIP Integration

- [ ] T152 Update SipUA initialization in `src/lib/SipUA.ts` to use AuthService for extension data
- [ ] T153 Add listener in SipUA for auth state changes (re-initialize on login)
- [ ] T154 Add error handling in SipUA for missing extension configuration

#### Upload UI Enhancements

- [ ] T155 [P] Create UploadStatus component in `src/window/phone/UploadStatus.tsx` showing queue status
- [ ] T156 [P] Add upload history view in settings showing recent uploads
- [ ] T157 [P] Add manual clear queue button for failed uploads

#### Accessibility

- [ ] T158 [P] Add ARIA labels to all form inputs
- [ ] T159 [P] Add keyboard navigation support for all forms
- [ ] T160 [P] Test with screen reader and fix issues

#### Documentation

- [ ] T161 [P] Add JSDoc comments to all API functions in authApi.ts and uploadApi.ts
- [ ] T162 [P] Add JSDoc comments to all service methods in AuthService and UploadService
- [ ] T163 [P] Update README with authentication setup instructions

---

## Parallel Execution Opportunities

### Within User Stories

Most tasks within the same phase can be parallelized if they touch different files:

**Example - US1 (Registration)**:

```
Parallel Set 1 (Data Layer):
├── T017 [P] Create RegisterRequest type
├── T018 [P] Create RegisterResponse type
├── T019 [P] Create Operator interface
├── T020 [P] Create Company interface
└── T021 [P] Create SIP Extension interface

Sequential: T022-T023 (API Client) → depends on types

Parallel Set 2 (UI):
├── T024-T031 (RegisterForm component)
└── Can work independently once API client done

Sequential: T032-T033 (Integration) → needs completed components
```

**Example - US7 (Upload)**:

```
Parallel Set 1 (Data + API):
├── T071-T075 [P] Create types/interfaces
└── T076-T078 [P] API client (depends on types)

Parallel Set 2 (Storage):
├── T079 [P] Upload queue storage
└── T080 [P] Audio storage (IndexedDB)

Parallel Set 3 (Services):
├── T081-T085 UploadService
└── T086-T089 SipSession recording

Parallel Set 4 (Background + UI):
├── T090-T093 Background worker
└── T094-T096 UI indicators
```

### Cross-Story Parallelization

After completing foundational phase (Phase 2), these can be worked on in parallel:

```
US1 (Registration) + US6 (Password Reset)
├── Both independent, different API endpoints
└── Both can develop simultaneously

US4 (Profile) + US5 (Password Change) + US8 (Logout)
├── All need US3 (Login) complete
└── All touch different components, can parallelize
```

---

## Task Validation Checklist

✅ **Format**: All tasks follow `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ **Organization**: Tasks grouped by User Story phase
✅ **Dependencies**: Clear story completion order documented
✅ **File Paths**: Every task includes specific file path
✅ **Independence**: Each story phase is independently testable
✅ **Parallelization**: [P] markers on parallelizable tasks
✅ **Story Labels**: [US1]-[US8] labels on all user story tasks
✅ **MVP Scope**: US1, US2, US3, US7 identified as MVP

---

## Summary

- **Total Tasks**: 163
- **Setup Phase**: 10 tasks
- **Foundational Phase**: 6 tasks
- **User Story 1**: 17 tasks
- **User Story 2**: 14 tasks
- **User Story 3**: 23 tasks
- **User Story 7**: 26 tasks
- **User Story 4**: 7 tasks
- **User Story 5**: 12 tasks
- **User Story 6**: 17 tasks
- **User Story 8**: 6 tasks
- **Polish Phase**: 22 tasks

**Parallel Opportunities**: ~45 tasks marked with [P] (can be worked simultaneously with others)

**MVP Tasks**: 96 (Phases 1-2-3-4-5-6 = Setup + Foundational + US1 + US2 + US3 + US7)

**Suggested First Sprint**: Phases 1-2-3 (Setup + Foundational + US1) = ~26 tasks
**Suggested Second Sprint**: Phases 4-5 (US2 + US3) = ~37 tasks
**Suggested Third Sprint**: Phase 6 (US7) = ~26 tasks

---

**Status**: ✅ Tasks Ready for Implementation
**Next Step**: Start with Phase 1 (Setup) tasks T001-T010
**Branch**: `001-api-auth-integration`
