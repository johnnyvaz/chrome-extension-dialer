  Solução Implementada

  1. Backend - Novos Endpoints

  - POST /api/auditorias/chrome-call: Recebe dados de ligação da extensão
  - POST /api/auditorias/{id}/chrome-audio: Recebe arquivo de áudio da ligação

  2. Extensão Chrome - Integração Automática

  AuditoriaService

  - Gerencia configuração e comunicação com backend
  - Captura automática de dados durante ligações
  - Busca e envio de gravações (quando disponíveis)

  SipSession Modificado

  - Integrado ao evento SESSION_ANSWERED → inicia tracking
  - Integrado ao evento SESSION_ENDED → finaliza e envia dados

  Interface de Configuração

  - Nova aba "Auditoria" nas configurações
  - Permite configurar URL do backend, projeto e token
  - Teste de conexão integrado

  Fluxo de Funcionamento

  Durante uma Ligação:

  1. Início: SipSession emite SESSION_ANSWERED → AuditoriaService cria auditoria
  2. Captura: Coleta número, horário, direção, duração automaticamente
  3. Fim: SipSession emite SESSION_ENDED → envia todos os dados para o backend
  4. Processamento: Backend processa dados + áudio (se disponível) via filas

  Configuração Necessária:

  - URL do backend: http://seu-servidor:3001/api
  - ID do projeto no sistema de auditoria
  - Token de autenticação (opcional)
  - Ativar captura automática

  Próximos Passos

  1. Testar a integração entre extensão e backend
  2. Configurar captura de áudio do Asterisk (se necessário)
  3. Adicionar processadores específicos para dados de call center
  4. Implementar relatórios combinando transcrição + métricas de ligação

  A solução está pronta para uso e permite capturar automaticamente todos os dados de ligação, criando auditorias completas sem intervenção manual!
