# Sistema de Autenticação – Guia para Extensão Chrome (Softphone)

## 1. Contexto e Ambiente

- **Base URL (dev)**: `https://api.stage.scany.com.br/api/v1`
- **Versão da API**: `v1`
- **Autenticação**: `access_token` emitido pelo Supabase Auth (`Authorization: Bearer <token>`)
- **Formato das requisições**: JSON (`Content-Type: application/json`)
- **Multi-tenant**: a empresa é identificada pelo CNPJ informado ou pela empresa vinculada ao usuário autenticado
- **Ramal SIP**: parâmetros opcionais no registro e retornados no login para configuração automática do softphone

---

## 2. Fluxos Principais

1. Registro do operador (`POST /auth/register`)
2. Confirmação de e-mail (`POST /auth/confirm-email`)
3. Reenvio de e-mail de confirmação (`POST /auth/confirm-email/resend`)
4. Login com dados do ramal (`POST /auth/login`)
5. Perfil do usuário autenticado (`GET /auth/profile`)
6. Alteração de senha autenticado (`POST /auth/change-password`)
7. Solicitação de reset de senha (`POST /auth/reset-password`)
8. Confirmação de reset de senha (`POST /auth/reset-password/confirm`)
9. Logout (`POST /auth/logout`)

---

## 3. Registro de Operador

- **Endpoint**: `POST /auth/register`
- **Uso**: criar conta do operador, empresa (CNPJ/CPF) e ramal opcional
- **Body**:

```json
{
  "email": "operador@example.com",
  "password": "Senha123!",
  "nome": "Joao Operador",
  "empresa": "Empresa XPTO",
  "cnpj": "12345678000199",
  "cpf": null,
  "ramalNumero": "1001",
  "ramalServidorSip": "sip.exemplo.com",
  "ramalPortaSip": 5060,
  "ramalSenhaSip": "SenhaSIP"
}
```

- **Resposta (201)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "operador@example.com",
      "nome": "Joao Operador",
      "empresaId": "uuid"
    },
    "empresa": {
      "id": "uuid",
      "nome": "Empresa XPTO",
      "cnpj": "12345678000199"
    },
    "ramal": {
      "id": "uuid",
      "numero": "1001",
      "servidorSip": "sip.exemplo.com",
      "portaSip": 5060
    }
  },
  "message": "Usuario, empresa e ramal (quando informado) criados com sucesso."
}
```

- **Observações**:
  - Campos obrigatórios: `email`, `password`, `nome`, `empresa`
  - Utiliza **CNPJ** como documento principal (CPF opcional para PF)
  - Ramal é opcional; relação 1:1 entre operador e ramal
  - Supabase envia o email de confirmação automaticamente

---

## 4. Confirmacao de E-mail

- **Endpoint**: `POST /auth/confirm-email`
- **Body**:

```json
{
  "accessToken": "token_fornecido_supabase"
}
```

### 4.1 Fluxo via Supabase

- O link recebido por email vem do Supabase e contém `access_token`.
- A extensão deve capturar esse token e chamar `/auth/confirm-email`.
- Não existem tokens de confirmação locais; todo o fluxo depende do Supabase Auth.

- **Resposta (200)**:

```json
{
  "success": true,
  "message": "Email confirmado com sucesso."
}
```

---

## 5. Reenvio de E-mail de Confirmacao

- **Endpoint**: `POST /auth/confirm-email/resend`
- **Body**:

```json
{
  "email": "operador@example.com"
}
```

- **Resposta (200)**:

```json
{
  "success": true,
  "message": "Email de confirmacao reenviado."
}
```

---

## 6. Login com Dados do Ramal

- **Endpoint**: `POST /auth/login`
- **Body**:

```json
{
  "email": "operador@example.com",
  "password": "Senha123!",
  "cnpj": "12345678000199"
}
```

- **Resposta (200)**:

```json
{
  "success": true,
  "data": {
    "token": "supabase-access-token",
    "user": {
      "id": "uuid",
      "email": "operador@example.com",
      "nome": "Joao Operador",
      "role": "operator",
      "empresaId": "uuid",
      "ramalId": "uuid"
    },
    "ramal": {
      "numero": "1001",
      "servidorSip": "sip.exemplo.com",
      "portaSip": 5060,
      "senhaSipEncrypted": "$2b$10$hash..."
    }
  },
  "message": "Login realizado com sucesso."
}
```

- **Passos na extensao**:
  1. Executar o login
  2. Persistir `token` em armazenamento seguro
  3. Configurar o softphone usando os campos do objeto `ramal`
  4. Incluir `Authorization: Bearer <token>` em todas as chamadas autenticadas

---

## 7. Perfil do Usuario Autenticado

- **Endpoint**: `GET /auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Resposta (200)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "operador@example.com",
    "nome": "Joao Operador",
    "role": "operator",
    "empresaId": "uuid",
    "ramal": {
      "numero": "1001",
      "servidorSip": "sip.exemplo.com",
      "portaSip": 5060
    }
  }
}
```

---

## 8. Alteracao de Senha (Autenticado)

- **Endpoint**: `POST /auth/change-password`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:

```json
{
  "currentPassword": "Senha123!",
  "newPassword": "NovaSenha456!"
}
```

- **Resposta (200)**:

```json
{
  "success": true,
  "message": "Senha alterada com sucesso."
}
```

---

## 9. Reset de Senha

### 9.1 Solicitar Reset

- **Endpoint**: `POST /auth/reset-password`
- **Body**:

```json
{
  "email": "operador@example.com"
}
```

- **Resposta (200)**: mensagem informando o envio de link, independente da existencia do usuario

### 9.2 Confirmar Reset

- **Endpoint**: `POST /auth/reset-password/confirm`
- **Body**:

```json
{
  "accessToken": "token_fornecido_supabase",
  "newPassword": "NovaSenha456!"
}
```

- **Resposta (200)**:

```json
{
  "success": true,
  "message": "Senha redefinida com sucesso."
}
```

---

## 10. Logout

- **Endpoint**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:

```json
{
  "userId": "uuid"
}
```

- **Resposta (200)**:

```json
{
  "success": true,
  "message": "Sessao encerrada com sucesso."
}
```

- **Acao no cliente**: remover token local e limpar configuracao do ramal

---

## 11. Cabecalhos e Requisitos Gerais

- `Authorization`: obrigatorio nos endpoints protegidos
- `Content-Type`: `application/json`
- `User-Agent`: desejavel para fins de logging
- `X-Request-Id`: opcional para correlacao de logs

---

## 12. Tratamento de Erros

| Codigo | Situacao                               | Exemplo                                                      |
|--------|----------------------------------------|--------------------------------------------------------------|
| 400    | Validacao falhou                       | `{ "success": false, "code": "VALIDATION_ERROR" }`         |
| 401    | Nao autenticado ou token invalido      | `{ "success": false, "code": "UNAUTHORIZED" }`             |
| 403    | Sem permissao (nao usado neste fluxo)  | `{ "success": false, "code": "FORBIDDEN" }`                |
| 404    | Recurso nao encontrado                 | `{ "success": false, "code": "NOT_FOUND" }`                |
| 409    | Conflito (CNPJ/CPF ja registrado)      | `{ "success": false, "code": "CONFLICT" }`                 |
| 429    | Rate limiting atingido                 | `{ "success": false, "code": "RATE_LIMIT_EXCEEDED" }`      |
| 500    | Erro interno                           | `{ "success": false, "code": "INTERNAL_ERROR" }`           |

---

## 13. Rate Limiting (Padrao)

- Login: 5 tentativas a cada 15 minutos por IP/usuario
- Registro: 3 tentativas a cada 60 minutos por IP
- Reenvio de confirmacao e reset de senha: cooldown curto (ex.: 1 minuto) por email

---

## 14. Seguranca e Boas Praticas na Extensao

- Persistir o token em armazenamento seguro (por exemplo, `chrome.storage.session`)
- Nunca armazenar a senha SIP em texto puro; usar o hash retornado
- Renovar ou expirar tokens conforme politicas futuras da API
- Sanitizar entradas de usuario (email, CNPJ, CPF) antes de enviar
- Tratar respostas 401 desalojando o usuario e forçando novo login
- Garantir uso de HTTPS em producao
- Evitar logs com dados sensiveis no lado cliente

---

## 15. Fluxo Sequencial (Happy Path)

1. Registro (`POST /auth/register`)
2. Usuario confirma email via link (Supabase) e API (`POST /auth/confirm-email`)
3. Login (`POST /auth/login`)
4. Extensao guarda token e configura ramal via dados retornados
5. Perfil (`GET /auth/profile`) para dados atualizados
6. Logout (`POST /auth/logout`) quando necessario

---

## 16. Fluxos Alternativos

- Email nao confirmado: reenviar com `POST /auth/confirm-email/resend`
- Senha esquecida: realizar reset com `POST /auth/reset-password` + `POST /auth/reset-password/confirm`
- Alterar senha autenticado: usar `POST /auth/change-password`

---

## 17. Ferramentas de Teste

- Postman/Insomnia para validar endpoints
- `curl` para smoke tests
- Ambiente sandbox da extensao para validar a configuracao do ramal via SIP

---

## 18. Contato e Suporte

- Reportar incidentes com logs e `X-Request-Id` (se utilizado)
- Canal interno do time backend para duvidas sobre contratos ou novos fluxos
