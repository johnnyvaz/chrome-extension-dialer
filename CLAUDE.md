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

## 🧠 METODOLOGIA DE APRENDIZADO COM IA

### Filosofia de Desenvolvimento Educacional
Esta seção define como usar a IA como ferramenta de ENSINO, não substituição do pensamento crítico. O objetivo é manter o cérebro ativo e aprender estruturas de dados através de cada código gerado.

### Princípios Fundamentais
1. **IA como Professor**: Cada código deve ensinar algo sobre algoritmos e estruturas de dados
2. **Conexões com LeetCode**: Sempre relacionar implementações com problemas clássicos de programação
3. **Pensamento Crítico**: Explicar PORQUE escolhemos determinada abordagem, não apenas COMO implementar
4. **Análise de Complexidade**: Sempre incluir análise de tempo e espaço quando relevante
5. **Alternativas e Trade-offs**: Mostrar diferentes soluções possíveis e seus prós/contras

### Formato Obrigatório de Documentação
TODOS os arquivos e funções criados devem incluir o template educacional abaixo.

## 📚 PADRÕES ALGORÍTMICOS FUNDAMENTAIS

Baseado nos 8 padrões essenciais para entrevistas técnicas e desenvolvimento de software:

### 1. Two Pointers (Dois Ponteiros)
**Quando Usar**: Problemas com pares em arrays/listas, busca eficiente
**Conceito**: Dois ponteiros se movem através da estrutura de dados
**Complexidade**: O(n) tempo, O(1) espaço
**Aplicações no Projeto**: 
- Validação de inputs de telefone
- Busca em histórico de chamadas
- Processamento de streams de áudio

**Problemas LeetCode Relacionados**:
- Two Sum II, Remove Duplicates, Move Zeroes

### 2. Prefix Sum (Soma de Prefixos)
**Quando Usar**: Otimizar consultas de intervalo em arrays
**Conceito**: Pré-computar somas cumulativas para cálculos rápidos
**Complexidade**: O(n) pré-processamento, O(1) consulta
**Aplicações no Projeto**:
- Estatísticas de duração de chamadas
- Métricas de uso de créditos
- Análise de padrões de chamadas

**Problemas LeetCode Relacionados**:
- Range Sum Query, Subarray Sum Equals K

### 3. Sliding Window (Janela Deslizante)
**Quando Usar**: Problemas de subarray/substring contíguo
**Conceito**: Manter "janela" que expande/contrai sobre array
**Complexidade**: O(n) tempo, O(1) espaço
**Aplicações no Projeto**:
- Filtros de histórico por período
- Análise de qualidade de chamada em tempo real
- Buffer de áudio circular

**Problemas LeetCode Relacionados**:
- Longest Substring Without Repeating, Maximum Sum Subarray

### 4. Fast & Slow Pointers (Ponteiros Rápido e Lento)
**Quando Usar**: Detecção de ciclos em listas ligadas
**Conceito**: Dois ponteiros com velocidades diferentes
**Complexidade**: O(n) tempo, O(1) espaço
**Aplicações no Projeto**:
- Detecção de loops em configurações SIP
- Prevenção de loops infinitos em reconexões
- Validação de dependências circulares

**Problemas LeetCode Relacionados**:
- Linked List Cycle, Find Duplicate Number, Happy Number

### 5. LinkedList In-Place Reversal (Reversão In-Place de Lista)
**Quando Usar**: Reverter partes de listas sem espaço extra
**Conceito**: Reversão iterativa/recursiva de lista
**Complexidade**: O(n) tempo, O(1) espaço
**Aplicações no Projeto**:
- Reorganização de histórico de chamadas
- Reversão de operações (undo/redo)
- Reordenação de contas SIP

**Problemas LeetCode Relacionados**:
- Reverse Linked List, Reverse Linked List II, Swap Nodes

### 6. Monotonic Stack (Pilha Monotônica)
**Quando Usar**: Encontrar próximo elemento maior/menor
**Conceito**: Manter stack em ordem sorted
**Complexidade**: O(n) tempo, O(n) espaço
**Aplicações no Projeto**:
- Processamento de eventos de chamada em ordem
- Análise de picos de qualidade de áudio
- Validação de sequências de configuração

**Problemas LeetCode Relacionados**:
- Daily Temperatures, Next Greater Element, Largest Rectangle

### 7. Top 'K' Elements (Top K Elementos)
**Quando Usar**: Encontrar K maiores/menores/mais frequentes elementos
**Conceito**: Usar heaps ou ordenação
**Complexidade**: O(n log k) tempo, O(k) espaço
**Aplicações no Projeto**:
- Top K números mais chamados
- K chamadas mais longas
- K melhores qualidades de conexão

**Problemas LeetCode Relacionados**:
- Top K Frequent Elements, Kth Largest Element

### 8. Overlapping Intervals (Intervalos Sobrepostos)
**Quando Usar**: Manipular ranges de tempo ou numéricos
**Conceito**: Ordenar e mesclar intervalos
**Complexidade**: O(n log n) tempo, O(1) espaço
**Aplicações no Projeto**:
- Merge de períodos de chamadas
- Conflitos de horários de conferência
- Otimização de janelas de auditoria

**Problemas LeetCode Relacionados**:
- Merge Intervals, Insert Interval, Meeting Rooms

## 📝 TEMPLATE DE DOCUMENTAÇÃO EDUCACIONAL

### Formato Obrigatório para Funções e Classes

```typescript
/**
 * ═══════════════════════════════════════════════════════════════
 * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
 * ═══════════════════════════════════════════════════════════════
 * 
 * PADRÃO ALGORÍTMICO: [Nome do padrão dos 8 fundamentais]
 * ESTRUTURA DE DADOS PRINCIPAL: [Array, LinkedList, Stack, Queue, Hash, Tree, etc.]
 * COMPLEXIDADE TEMPORAL: O(?) 
 * COMPLEXIDADE ESPACIAL: O(?)
 * 
 * 🤔 PORQUE ESTA ABORDAGEM:
 * - [Explicação detalhada do raciocínio por trás da escolha]
 * - [Por que esta estrutura de dados é ideal para este problema]
 * - [Quais foram as alternativas consideradas e por que foram descartadas]
 * 
 * 🔗 CONEXÃO COM LEETCODE:
 * - Padrão: [Qual dos 8 padrões fundamentais se aplica]
 * - Problemas Similares: [Lista de problemas LeetCode relacionados]
 * - Variações: [Como este código se relaciona com variações do problema]
 * 
 * ⚡ OTIMIZAÇÕES POSSÍVEIS:
 * - [Melhorias que poderiam ser implementadas]
 * - [Trade-offs entre tempo, espaço e complexidade de código]
 * - [Quando vale a pena otimizar vs manter simples]
 * 
 * 🎯 CENÁRIOS DE USO NO PROJETO:
 * - [Como esta implementação se encaixa no contexto da extensão Chrome]
 * - [Que outros componentes poderiam se beneficiar de abordagem similar]
 * 
 * 📚 CONCEITOS APRENDIDOS:
 * - [Principais takeaways sobre estruturas de dados]
 * - [Padrões de design aplicados]
 * - [Boas práticas demonstradas]
 * ═══════════════════════════════════════════════════════════════
 */
```

### Formato para Arquivos Completos

```typescript
/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - [NOME_DO_ARQUIVO]
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: [Singleton, Factory, Observer, etc.]
 * 📊 ESTRUTURAS PRINCIPAIS: [Quais estruturas de dados dominam este arquivo]
 * 🔄 FLUXO DE DADOS: [Como os dados fluem através das funções]
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. [Padrão 1]: [Onde é usado e por quê]
 * 2. [Padrão 2]: [Onde é usado e por quê]
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - [Principais lições sobre eficiência]
 * - [Como este arquivo exemplifica boas práticas]
 * - [Conexões com problemas clássicos de programação]
 * ═══════════════════════════════════════════════════════════════
 */
```

## 🎯 INSTRUÇÕES ESPECÍFICAS PARA O CLAUDE

### Responsabilidades Obrigatórias
1. **SEMPRE identificar** qual dos 8 padrões fundamentais se aplica ao código
2. **SEMPRE explicar** PORQUE escolheu determinada estrutura de dados
3. **SEMPRE conectar** implementações com problemas LeetCode
4. **SEMPRE mostrar** alternativas e trade-offs
5. **SEMPRE incluir** análise de complexidade quando relevante
6. **SEMPRE usar** o template de documentação educacional

### Processo de Geração de Código
1. **Análise Prévia**: Antes de escrever código, identifique o padrão algorítmico
2. **Implementação**: Escreva o código com o padrão em mente
3. **Documentação**: Adicione o template educacional completo
4. **Conexões**: Relacione com problemas LeetCode similares
5. **Reflexão**: Explique por que esta é a melhor abordagem

### Prioridades de Aprendizado
- **Prioridade 1**: Estruturas de dados fundamentais (Array, LinkedList, Stack, Queue, Hash)
- **Prioridade 2**: Padrões algorítmicos dos 8 fundamentais
- **Prioridade 3**: Análise de complexidade e otimizações
- **Prioridade 4**: Padrões de design e arquitetura

## 🗺️ MAPEAMENTO PROJETO → ALGORITMOS

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

### 🎯 Diretrizes de Implementação

#### Para Cada Novo Componente:
1. **Identifique o padrão algorítmico** antes de começar a codificar
2. **Escolha a estrutura de dados** mais eficiente para o caso de uso
3. **Documente a conexão** com problemas LeetCode similares
4. **Analise a complexidade** temporal e espacial
5. **Considere alternativas** e justifique a escolha

#### Prioridades de Aprendizado por Complexidade:
- **Iniciante**: Arrays, Hash Maps, Strings básicos
- **Intermediário**: Linked Lists, Stacks, Queues, Trees
- **Avançado**: Heaps, Graphs, Dynamic Programming, Advanced algorithms

#### Métricas de Sucesso:
- Cada função tem análise de complexidade documentada
- Conexões claras com padrões LeetCode identificadas
- Alternativas de implementação consideradas e documentadas
- Trade-offs entre performance e legibilidade explicados
