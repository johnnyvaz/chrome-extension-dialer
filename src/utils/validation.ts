import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;

  // Remove formatação (pontos, barra, hífen)
  const cleanCNPJ = cnpj.replace(/[^\d]/g, "");

  // Deve ter exatamente 14 dígitos
  if (cleanCNPJ.length !== 14) return false;

  // Rejeita CNPJs com todos dígitos iguais (00000000000000, 11111111111111, etc)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Converte string para array de números
  const digits = cleanCNPJ.split("").map(Number);

  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += digits[i] * weights1[i];
  }
  const remainder1 = sum1 % 11;
  const checkDigit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  if (digits[12] !== checkDigit1) return false;

  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += digits[i] * weights2[i];
  }
  const remainder2 = sum2 % 11;
  const checkDigit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  if (digits[13] !== checkDigit2) return false;

  return true;
}

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 *
 * @param cnpj - CNPJ sem formatação
 * @returns CNPJ formatado ou string vazia se inválido
 *
 * @example
 * ```typescript
 * formatCNPJ('11222333000181'); // '11.222.333/0001-81'
 * ```
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, "");

  if (cleanCNPJ.length !== 14) return "";

  return cleanCNPJ.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE CPF (Cadastro de Pessoa Física)
 * ═══════════════════════════════════════════════════════════════
 *
 * Similar ao CNPJ, mas com 11 dígitos
 * Usado caso backend permita CPF além de CNPJ
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida CPF brasileiro (11 dígitos)
 *
 * @param cpf - CPF com ou sem formatação
 * @returns true se CPF é válido
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;

  const cleanCPF = cpf.replace(/[^\d]/g, "");

  if (cleanCPF.length !== 11) return false;

  // Rejeita CPFs com todos dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  const digits = cleanCPF.split("").map(Number);

  // Primeiro dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * (10 - i);
  }
  const remainder1 = (sum1 * 10) % 11;
  const checkDigit1 = remainder1 === 10 ? 0 : remainder1;

  if (digits[9] !== checkDigit1) return false;

  // Segundo dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += digits[i] * (11 - i);
  }
  const remainder2 = (sum2 * 10) % 11;
  const checkDigit2 = remainder2 === 10 ? 0 : remainder2;

  if (digits[10] !== checkDigit2) return false;

  return true;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/[^\d]/g, "");

  if (cleanCPF.length !== 11) return "";

  return cleanCPF.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Valida CPF ou CNPJ automaticamente baseado no tamanho
 *
 * @param document - CPF (11 dígitos) ou CNPJ (14 dígitos) com ou sem formatação
 * @returns true se documento é válido (CPF ou CNPJ)
 *
 * @example
 * ```typescript
 * validateCPForCNPJ('12345678909');        // valida como CPF
 * validateCPForCNPJ('11222333000181');     // valida como CNPJ
 * validateCPForCNPJ('123.456.789-09');     // valida como CPF
 * validateCPForCNPJ('11.222.333/0001-81'); // valida como CNPJ
 * ```
 */
export function validateCPForCNPJ(doc: string): boolean {
  if (!doc) return false;

  const cleanDocument = doc.replace(/[^\d]/g, "");

  if (cleanDocument.length === 11) {
    return validateCPF(cleanDocument);
  } else if (cleanDocument.length === 14) {
    return validateCNPJ(cleanDocument);
  }

  return false;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE EMAIL
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida email usando regex padrão RFC 5322 simplificado
 *
 * @param email - Endereço de email
 * @returns true se email é válido
 *
 * @example
 * ```typescript
 * validateEmail('usuario@empresa.com.br'); // true
 * validateEmail('usuario@empresa');        // false
 * validateEmail('usuario@.com');           // false
 * ```
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  // Regex simplificado mas robusto para emails
  // Não captura 100% dos casos edge da RFC 5322, mas cobre 99.9% dos casos reais
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) return false;

  // Validações adicionais
  const [localPart, domain] = email.split("@");

  // Local part não pode ter mais de 64 caracteres
  if (localPart.length > 64) return false;

  // Domain não pode ter mais de 255 caracteres
  if (domain.length > 255) return false;

  // Domain deve ter pelo menos um ponto
  if (!domain.includes(".")) return false;

  // Extensão do domain deve ter pelo menos 2 caracteres
  const extension = domain.split(".").pop();
  if (!extension || extension.length < 2) return false;

  return true;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE TELEFONE (E.164 format)
 * ═══════════════════════════════════════════════════════════════
 *
 * Usa google-libphonenumber para validação robusta
 * Formato E.164: +[country code][number]
 * Exemplo: +5511999887766 (Brasil)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida número de telefone internacional (formato E.164)
 *
 * @param phoneNumber - Número com código do país (ex: +5511999887766)
 * @param defaultCountry - País padrão se não especificado (ex: 'BR')
 * @returns true se telefone é válido
 *
 * @example
 * ```typescript
 * validatePhoneNumber('+5511999887766');           // true
 * validatePhoneNumber('11999887766', 'BR');        // true
 * validatePhoneNumber('+1234567890');              // false
 * ```
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry: string = "BR"
): boolean {
  if (!phoneNumber) return false;

  try {
    // isValidPhoneNumber retorna true se número é válido para qualquer país
    return isValidPhoneNumber(phoneNumber, defaultCountry as any);
  } catch (error) {
    return false;
  }
}

/**
 * Formata número de telefone para formato E.164
 *
 * @param phoneNumber - Número em qualquer formato
 * @param defaultCountry - País padrão
 * @returns Número formatado em E.164 ou string vazia se inválido
 *
 * @example
 * ```typescript
 * formatPhoneNumber('(11) 99988-7766', 'BR'); // '+5511999887766'
 * formatPhoneNumber('11999887766', 'BR');     // '+5511999887766'
 * ```
 */
export function formatPhoneNumber(
  phoneNumber: string,
  defaultCountry: string = "BR"
): string {
  if (!phoneNumber) return "";

  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any);
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
    return "";
  } catch (error) {
    return "";
  }
}

/**
 * Formata número de telefone para exibição nacional
 *
 * @param phoneNumber - Número em formato E.164
 * @returns Número formatado para exibição local
 *
 * @example
 * ```typescript
 * formatPhoneNumberForDisplay('+5511999887766'); // '(11) 99988-7766'
 * ```
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return "";

  try {
    const parsed = parsePhoneNumber(phoneNumber);
    if (parsed && parsed.isValid()) {
      return parsed.formatNational();
    }
    return phoneNumber;
  } catch (error) {
    return phoneNumber;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE SENHA
 * ═══════════════════════════════════════════════════════════════
 */

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-4 (0=muito fraca, 4=muito forte)
  feedback: string[];
}

/**
 * Valida força de senha
 *
 * Critérios:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Opcionalmente 1 caractere especial para score máximo
 *
 * @param password - Senha a validar
 * @returns Objeto com resultado da validação e score
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      score: 0,
      feedback: ["Senha é obrigatória"],
    };
  }

  // Comprimento mínimo
  if (password.length < 8) {
    feedback.push("Senha deve ter pelo menos 8 caracteres");
  } else {
    score++;
  }

  // Letra maiúscula
  if (!/[A-Z]/.test(password)) {
    feedback.push("Adicione pelo menos uma letra maiúscula");
  } else {
    score++;
  }

  // Letra minúscula
  if (!/[a-z]/.test(password)) {
    feedback.push("Adicione pelo menos uma letra minúscula");
  } else {
    score++;
  }

  // Número
  if (!/\d/.test(password)) {
    feedback.push("Adicione pelo menos um número");
  } else {
    score++;
  }

  // Caractere especial (opcional para score máximo)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push("Adicione um caractere especial para senha mais forte");
  } else {
    score++;
  }

  const isValid = score >= 4; // Mínimo: 8 chars + maiúscula + minúscula + número

  return {
    isValid,
    score: Math.min(score, 4),
    feedback,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE URL
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida URL (para configuração de SIP server, upload URL, etc)
 *
 * @param url - URL a validar
 * @param allowedProtocols - Protocolos permitidos (padrão: ['http', 'https', 'ws', 'wss'])
 * @returns true se URL é válida
 */
export function validateUrl(
  url: string,
  allowedProtocols: string[] = ["http", "https", "ws", "wss"]
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(":", "");
    return allowedProtocols.includes(protocol);
  } catch (error) {
    return false;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE SIP PORT
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida porta SIP
 *
 * @param port - Porta a validar
 * @returns true se porta é válida (1-65535)
 */
export function validateSipPort(port: number | string): boolean {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;

  if (isNaN(portNum)) return false;
  if (portNum < 1 || portNum > 65535) return false;

  return true;
}
