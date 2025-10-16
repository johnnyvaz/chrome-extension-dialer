# Quickstart Guide: API Authentication Integration

**Feature**: API Authentication Integration
**Date**: 2025-10-16
**For**: Developers implementing the authentication system

## Overview

Este guia fornece instruções rápidas para desenvolver, testar e fazer build do sistema de autenticação da extensão Chrome do softphone Scany.

---

## Prerequisites

- Node.js 16+ e npm instalados
- Chrome ou Edge browser para testar extensão
- Git configurado

---

## Setup do Ambiente

### 1. Clone e Install

```bash
cd /home/johnny/Documentos/CLIENTES/SCANY/chrome-extension-dialer
npm install
```

### 2. Configuração da API

Verifique que a URL base está correta em `src/api/constants.ts`:

```typescript
export const API_BASE_URL = 'https://api.stage.scany.com.br/api/v1';
```

---

## Development Workflow

### Build da Extensão

```bash
# Build único
npm run build

# Build com watch (recompila automaticamente)
npm run watch
```

Output: `dist/` folder

### Carregar Extensão no Chrome

1. Abra Chrome e vá para `chrome://extensions`
2. Ative "Modo desenvolvedor" (canto superior direito)
3. Clique "Carregar sem compactação"
4. Selecione a pasta `dist/`
5. Extensão aparecerá na toolbar

### Hot Reload Durante Desenvolvimento

```bash
# Terminal 1: watch mode
npm run watch

# Após mudanças:
# - Vá para chrome://extensions
# - Clique no ícone de reload da extensão
# - Ou use Ctrl+R na página da extensão
```

---

## Testing Authentication Flows

### 1. Testar Registro

1. Click no ícone da extensão
2. Click em "Criar Conta"
3. Preencha formulário:
   - **Email**: `teste@empresa.com`
   - **Senha**: `SenhaForte123`
   - **Nome**: `João Silva`
   - **Empresa**: `Empresa Teste LTDA`
   - **CNPJ**: `12345678901234` (formato válido)
4. Opcional: Preencha dados SIP
5. Submit e verifique email de confirmação

**Expected**: Mensagem de sucesso + redirect para "Confirmar Email"

### 2. Testar Confirmação de Email

Opção A: Link real do email (requer backend funcional)

Opção B: Simular com token mock:

```typescript
// No DevTools Console da extensão:
await chrome.storage.session.set({
  auth_token: 'mock_token_for_testing'
});
// Reload extensão
```

### 3. Testar Login

1. Click em "Entrar"
2. Credenciais:
   - **Email**: `teste@empresa.com`
   - **Senha**: `SenhaForte123`
   - **CNPJ**: `12345678901234`
3. Submit

**Expected**:
- Token armazenado em chrome.storage.session
- Redirect para tela principal (softphone)
- SIP extension configurado automaticamente

### 4. Testar Token Validation

```bash
# Recarregue a extensão (simula restart do browser)
# Expected: Profile endpoint é chamado para validar token
# Se válido: Mantém authenticated
# Se 401: Redirect para login
```

### 5. Testar Upload de Chamada

Pre-requisito: Estar autenticado

```typescript
// No DevTools Console, simular fim de chamada:
const recording = {
  id: crypto.randomUUID(),
  caller: '+5511999887766',
  callee: '+5511988776655',
  startedAt: new Date().toISOString(),
  durationSeconds: 125,
  audioBlob: new Blob(['fake audio'], { type: 'audio/webm' }),
  audioSizeBytes: 1024,
  projectId: 'stored_project_id',
  insightId: 'stored_insight_id',
  uploadStatus: 'pending',
  createdAt: Date.now()
};

// Enfileirar upload
uploadQueue.enqueue(recording);

// Verificar fila
const queue = await chrome.storage.local.get('upload_queue');
console.log('Queue:', queue);
```

### 6. Testar Retry de Upload

```typescript
// Simular falha de network:
// 1. Abra DevTools > Network tab
// 2. Ative "Offline" mode
// 3. Enfileire upload (conforme passo 5)
// 4. Observe console: retry automático com backoff
// 5. Desative "Offline"
// 6. Upload deve completar automaticamente
```

---

## Running Tests

```bash
# Rodar todos os testes
npm test

# Rodar testes específicos
npm test -- auth

Service.test.ts

# Rodar com coverage
npm test -- --coverage

# Watch mode (re-run on file changes)
npm test -- --watch
```

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── authService.test.ts       # Auth logic
│   │   └── uploadService.test.ts     # Upload queue logic
│   ├── storage/
│   │   ├── authStorage.test.ts       # Chrome storage mocks
│   │   └── uploadQueue.test.ts       # Queue persistence
│   └── utils/
│       ├── validation.test.ts        # CNPJ, email validation
│       └── retry.test.ts             # Exponential backoff
│
└── integration/
    ├── auth-flow.test.ts             # Full auth flow
    └── upload-flow.test.ts           # Full upload with retry
```

---

## Debugging

### DevTools da Extensão

#### Popup DevTools

1. Right-click no ícone da extensão
2. "Inspect popup"
3. Console, Network, Storage tabs disponíveis

#### Background Worker DevTools

1. `chrome://extensions`
2. Click "service worker" link da extensão
3. DevTools abrem para background worker

### Inspecionar Storage

```javascript
// No console da extensão:

// Session storage
await chrome.storage.session.get(null); // All data

// Local storage
await chrome.storage.local.get(null); // All data

// Specific keys
await chrome.storage.session.get('auth_token');
await chrome.storage.local.get('upload_queue');
```

### Inspecionar IndexedDB

1. DevTools > Application tab
2. IndexedDB > scany-softphone > audios
3. Ver blobs de áudio armazenados

### Network Monitoring

DevTools > Network tab:
- Ver requisições para API
- Verificar headers (Authorization)
- Inspecionar payloads
- Ver response codes

### Logs Estruturados

```typescript
// Usar console.log com contexto:
console.log('[AuthService] Login attempt', { email, cnpj });
console.log('[UploadQueue] Processing item', { id, retryCount });
console.error('[AuthService] Login failed', { error: error.message });
```

**NUNCA logar**:
- Passwords
- Tokens (JWT)
- SIP passwords
- Audio content

---

## Common Issues

### Issue: "Extension context invalidated"

**Cause**: Extension reloaded during development
**Solution**: Refresh popup/page que estava usando a extensão

### Issue: CORS errors

**Cause**: Backend não configurado para aceitar origin da extensão
**Solution**: Verificar backend permite extensão Chrome origins

### Issue: Storage limits exceeded

**Cause**: chrome.storage.local cheio (fila de uploads muito grande)
**Solution**:
```javascript
// Clear queue manualmente
await chrome.storage.local.remove('upload_queue');
```

### Issue: Audio recording não funciona

**Cause**: Permissões de microfone não concedidas
**Solution**: Verificar `manifest.json` tem permissão `microphone`

### Issue: Background worker não processa fila

**Cause**: Alarm não configurado ou worker crashed
**Solution**:
```javascript
// Re-criar alarm manualmente
chrome.alarms.create('PROCESS_UPLOAD_QUEUE', { periodInMinutes: 0.5 });
```

---

## API Endpoints Reference

Ver contratos completos em:
- `contracts/auth-api.yaml`
- `contracts/upload-api.yaml`

### Quick Reference

```
POST /auth/register        → Criar conta
POST /auth/login           → Autenticar
GET  /auth/profile         → Validar token
POST /auth/confirm-email   → Confirmar email
POST /auth/change-password → Trocar senha
POST /auth/reset-password  → Solicitar reset
POST /auth/logout          → Finalizar sessão

POST /softphone/uploads    → Upload de chamada
```

---

## File Structure Quick Reference

```
src/
├── api/
│   ├── authApi.ts           # Cliente HTTP para auth
│   └── uploadApi.ts         # Cliente HTTP para upload
├── services/
│   ├── authService.ts       # Lógica de autenticação
│   └── uploadService.ts     # Lógica de upload com retry
├── storage/
│   ├── authStorage.ts       # Persistência de auth
│   └── uploadQueue.ts       # Persistência de fila
├── window/auth/
│   ├── LoginForm.tsx        # Form de login
│   ├── RegisterForm.tsx     # Form de registro
│   └── ...                  # Outros forms
├── background/
│   └── index.ts             # Service worker (processa uploads)
└── utils/
    ├── validation.ts        # Validadores (CNPJ, email, etc)
    └── retry.ts             # Exponential backoff logic
```

---

## Next Steps

1. **Implementar Services**: Start com `authService.ts`
2. **Implementar Storage**: Criar `authStorage.ts`
3. **Criar UI Forms**: `LoginForm.tsx`, `RegisterForm.tsx`
4. **Integrar com SIP**: Modificar `SipUA.ts` para usar authService
5. **Implement Upload**: `uploadService.ts` + background worker
6. **Write Tests**: Unit tests primeiro, depois integration

Para tarefas detalhadas, executar:

```bash
/speckit.tasks
```

---

## Resources

- **Spec**: `spec.md`
- **Plan**: `plan.md`
- **Research**: `research.md`
- **Data Model**: `data-model.md`
- **API Contracts**: `contracts/*.yaml`
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/mv3/
- **Chakra UI Docs**: https://chakra-ui.com/docs/components

---

**Status**: ✅ Quickstart Complete
**Last Updated**: 2025-10-16
