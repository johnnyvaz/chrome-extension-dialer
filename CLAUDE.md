# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

Esta é uma extensão do Chrome para discagem telefônica WebRTC que se integra com a plataforma Scany. A extensão fornece uma solução VoIP completa com rastreamento de chamadas, gravação de áudio e capacidades de auditoria de chamadas. É construída com React, TypeScript e usa JsSIP para comunicação WebRTC.

## Comandos de Desenvolvimento

### Build e Desenvolvimento
- `npm run build` - Constrói a extensão para produção (cria pasta `dist/`)
- `npm run watch` - Constrói com observação de arquivos para desenvolvimento
- `npm run start` - Inicia servidor de desenvolvimento React (não usado tipicamente para extensão)

### Processo de Instalação
Após construir:
1. Abra a página de Extensões do Chrome/Edge
2. Habilite "Modo desenvolvedor"
3. Escolha "Carregar sem compactação"
4. Selecione a pasta `dist/`

## Visão Geral da Arquitetura

### Estrutura da Extensão
A extensão segue a arquitetura Chrome Extension Manifest V3:

**Background Script** (`src/background/`):
- Service worker para gerenciamento do ciclo de vida da extensão
- Manipula eventos da extensão e armazenamento

**Window/Popup** (`src/window/`):
- Interface principal construída com React e Chakra UI
- Três abas principais: Discador telefônico, Histórico de chamadas, Configurações
- Status de chamada em tempo real e controles

**Biblioteca SIP Principal** (`src/lib/`):
- Implementação WebRTC/SIP customizada usando JsSIP
- Classes: `SipUA`, `SipSession`, `SessionManager`, `SipAudioElements`
- Manipula estabelecimento de chamadas, gerenciamento de áudio e estado da sessão

**Serviço de Auditoria** (`src/services/auditoriaService.ts`):
- Funcionalidade de rastreamento e gravação de chamadas
- Integração com API backend do Scany para auditorias de chamadas
- Suporta gravação local e integração com servidor Asterisk
- Submissão automática de dados de chamadas e upload de arquivos de áudio

### Componentes Principais

**Componente Phone** (`src/window/phone/`):
- Teclado de discagem com tons DTMF
- Interfaces de chamadas recebidas/efetuadas
- Troca de contas e controles de chamada
- Suporte a chamadas em conferência

**Componente Settings** (`src/window/settings/`):
- Gerenciamento de contas SIP
- Configuração de auditoria
- Configurações avançadas de chamadas
- Validação de formulários de conta

**Histórico de Chamadas** (`src/window/history/`):
- Exibição de chamadas recentes
- Rastreamento de duração e status de chamadas
- Capacidades de busca e filtro

### Integração SIP

**Classes SIP Principais**:
- `SipUA`: User Agent para registro SIP
- `SipSession`: Gerenciamento de sessão de chamada individual
- `SessionManager`: Coordenação de múltiplas sessões
- `SipAudioElements`: Manipulação de dispositivos de áudio e mídia

**Recursos de Áudio**:
- Geração e reprodução de tons DTMF
- Capacidades de gravação de chamadas
- Suporte a múltiplos formatos de áudio (wav, mp3)
- Manipulação de sinal de retorno e ocupado

### Sistema de Auditoria

**Fluxo de Rastreamento de Chamadas**:
1. Iniciação de chamada dispara `auditoriaService.startCallTracking()`
2. Cria registro de auditoria no backend
3. Registra metadados da chamada (duração, direção, número de telefone)
4. Busca gravações no Asterisk ou usa gravação local
5. Faz upload de áudio e dados da chamada para o backend via API

**Configuração**:
- Configuração de URL do backend e ID do projeto
- Integração opcional com servidor Asterisk
- Suporte a token de autenticação
- Habilitar/desabilitar recursos de auditoria

## Notas de Desenvolvimento

### Configuração de Build
- Usa Webpack com loader TypeScript
- Dois alvos de build: background script e window/popup
- Copia conteúdo da pasta `public/` para `dist/`
- Suporte SASS/SCSS para estilização

### Gerenciamento de Armazenamento
- API de armazenamento do Chrome para persistência de configurações
- Armazenamento local para histórico de chamadas
- Configuração de auditoria armazenada no storage da extensão

### Integração com API
- Chamadas API RESTful para backend do Scany
- Suporte a autenticação JWT
- Upload de arquivos para gravações de áudio
- Submissão de dados de chamadas em tempo real

### Permissões da Extensão
- `storage`: Para configurações e histórico de chamadas
- `host_permissions`: Para WebRTC e chamadas de API
- Sem permissões de content script (extensão apenas popup)

## Dependências Técnicas

**Bibliotecas Principais**:
- React 18 com TypeScript
- Chakra UI para biblioteca de componentes
- JsSIP para funcionalidade WebRTC/SIP
- google-libphonenumber para formatação de números

**Ferramentas de Build**:
- Webpack 5 com compilação TypeScript
- SASS loader para estilização
- Copy plugin para assets estáticos

**APIs do Chrome**:
- Storage API para configurações persistentes
- Extension API para comunicação background/popup

**Linguagem**
- Fale sempre em portugues pt-br


### Componentes da Extensão Chrome e Seus Padrões

#### 📞 Sistema SIP (`src/lib/`)

**SipUA.ts (User Agent)**
- **Padrão**: Singleton + Observer
- **Estruturas**: Hash Map para registro de callbacks, Queue para eventos
- **Algoritmos**: Event-driven programming, State machine
- **Conexão LeetCode**: Observer pattern, Event handling

**SipSession.ts (Gerenciamento de Sessão)**
- **Padrão**: Two Pointers (para negociação SDP), State Machine
- **Estruturas**: Array para codecs, Hash Map para metadados de sessão
- **Algoritmos**: Finite State Machine, Resource management
- **Conexão LeetCode**: State transitions, Resource allocation

**SipSessionManager.ts (Múltiplas Sessões)**
- **Padrão**: Top K Elements (gerenciar sessões ativas), Factory Pattern
- **Estruturas**: Array/List para sessões ativas, Priority Queue para priorização
- **Algoritmos**: Load balancing, Resource pooling
- **Conexão LeetCode**: Top K problems, Heap operations

**SipAudioElements.ts (Gerenciamento de Áudio)**
- **Padrão**: Sliding Window (buffer de áudio), Queue/Stack
- **Estruturas**: Circular Buffer, Queue para audio chunks
- **Algoritmos**: Ring buffer implementation, Audio streaming
- **Conexão LeetCode**: Sliding window, Circular arrays

#### 🎛️ Interface de Usuário (`src/window/`)

**phone/dial-pad.tsx (Teclado Numérico)**
- **Padrão**: Two Pointers (validação de input), String manipulation
- **Estruturas**: String/Array para número digitado, Stack para backspace
- **Algoritmos**: Input validation, Format conversion
- **Conexão LeetCode**: String processing, Input validation

**history/index.tsx (Histórico de Chamadas)**
- **Padrão**: Sliding Window (filtros de data), Prefix Sum (estatísticas)
- **Estruturas**: Array de objetos de chamadas, Hash Map para indexação
- **Algoritmos**: Filtering, Sorting, Search algorithms
- **Conexão LeetCode**: Array filtering, Date range queries

**settings/accountForm.tsx (Formulário de Contas)**
- **Padrão**: Two Pointers (validação), State machine (form states)
- **Estruturas**: Object/Hash Map para campos do formulário
- **Algoritmos**: Form validation, State management
- **Conexão LeetCode**: Input validation, State transitions

#### 🔄 Serviços (`src/services/`)

**auditoriaService.ts (Auditoria de Chamadas)**
- **Padrão**: Overlapping Intervals (merge de períodos de chamada)
- **Estruturas**: Array de intervalos de tempo, Priority Queue para uploads
- **Algoritmos**: Interval merging, Async job processing
- **Conexão LeetCode**: Merge Intervals, Job scheduling

#### 💾 Armazenamento (`src/storage/`)

**index.ts (Gerenciamento de Storage)**
- **Padrão**: Two Pointers (compactação de dados), LRU Cache
- **Estruturas**: Hash Map para cache, Array para dados serializados
- **Algoritmos**: Caching strategies, Data serialization
- **Conexão LeetCode**: LRU Cache implementation, Hash table operations

#### 🎵 Processamento de Áudio (`src/lib/`)

**DialPadSoundElement.ts (Sons DTMF)**
- **Padrão**: Factory Pattern, Resource pooling
- **Estruturas**: Hash Map para mapeamento de tons, Array para buffers
- **Algoritmos**: Audio synthesis, Resource management
- **Conexão LeetCode**: Factory pattern, Resource allocation

### Cenários Educacionais Específicos

#### 🏗️ Arquiteturas de Design

**Publisher-Subscriber Pattern** (Eventos SIP)
- Implementado em: SipUA, SipSession
- Estrutura: Hash Map de listeners, Array de eventos
- Ensina: Event-driven programming, Loose coupling

**State Machine Pattern** (Estados de Chamada)
- Implementado em: SipSession, UI components
- Estrutura: Enum/Object para estados, Hash Map para transições
- Ensina: Finite state machines, State transitions

**Observer Pattern** (UI Updates)
- Implementado em: React components, Storage watchers
- Estrutura: Array de observers, Event queue
- Ensina: Reactive programming, Data flow

#### 🧮 Otimizações Algorítmicas

**Debouncing** (Input do usuário)
- Padrão: Sliding Window temporal
- Estrutura: Queue com timestamps
- Ensina: Event throttling, Performance optimization

**Memoization** (Cache de resultados)
- Padrão: Hash Map caching
- Estrutura: Map/Object para cache
- Ensina: Dynamic programming, Trade-offs espaço/tempo

**Lazy Loading** (Carregamento de histórico)
- Padrão: On-demand loading
- Estrutura: Paginated arrays
- Ensina: Performance optimization, Memory management

