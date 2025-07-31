/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - AVAILABLE_ACCOUNTS_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: List Rendering + Selection Pattern + DOM Reference
 * 📊 ESTRUTURAS PRINCIPAIS: Array de configurações, DOM Reference, Callback function
 * 🔄 FLUXO DE DADOS: Props-based rendering com event callback para seleção
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. Array Iteration: Rendering de lista com map() function
 * 2. Selection Pattern: UI para escolha de item ativo
 * 3. DOM Reference: useRef para controle de clique fora do componente
 * 4. Callback Pattern: Propagação de eventos para componente pai
 * 5. Conditional Rendering: Display de check mark para item ativo
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - Array.map() para O(n) rendering de elementos
 * - DOM reference para event handling eficiente
 * - Conditional rendering para visual feedback
 * - Callback pattern para loose coupling
 * - Single source of truth para estado ativo
 * ═══════════════════════════════════════════════════════════════
 */

import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { RefObject } from "react";
import { IAppSettings } from "src/common/types";

function AvailableAccounts({
  allSettings,
  onSetActive,
  refData,
}: {
  allSettings: IAppSettings[];
  onSetActive: (x: number) => void;
  refData: RefObject<HTMLDivElement>;
}) {
  return (
    <VStack
      zIndex={"modal"}
      ref={refData}
      w={"full"}
      alignItems={"start"}
      bg={"grey.200"}
      borderRadius={"xl"}
      className="absolute"
      padding={3}
      border={"1px"}
      borderColor={"gray.400"}
      boxShadow={"lg"}
    >
      {/**
       * ═══════════════════════════════════════════════════════════════
       * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
       * ═══════════════════════════════════════════════════════════════
       * 
       * PADRÃO ALGORÍTMICO: Array Iteration + Linear Search
       * ESTRUTURA DE DADOS PRINCIPAL: Array de objetos IAppSettings
       * COMPLEXIDADE TEMPORAL: O(n) onde n = número de contas
       * COMPLEXIDADE ESPACIAL: O(n) para elementos renderizados
       * 
       * 🤔 PORQUE ESTA ABORDAGEM:
       * - Array.map() é O(n) mas inevitável para renderização de todos os itens
       * - Índice usado como key pode causar problemas se array for reordenado
       * - Conditional rendering (el.active) evita re-render desnecessário do ícone
       * - Event handler inline pode ser otimizado com useCallback
       * 
       * 🔗 CONEXÃO COM LEETCODE:
       * - Padrão: Array iteration, Linear search
       * - Problemas Similares: Filter Array, Find Element in Array
       * - Variações: Array grouping, Sorting arrays
       * 
       * ⚡ OTIMIZAÇÕES POSSÍVEIS:
       * - Usar el.id como key ao invés de índice
       * - Memoizar componente com React.memo para evitar re-renders
       * - useCallback para event handlers se lista for grande
       * - Virtualização se número de contas for muito grande (>1000)
       * 
       * 🎯 CENÁRIOS DE USO NO PROJETO:
       * - Lista de contas SIP configuradas
       * - Selection de conta ativa para chamadas
       * - Display de status de cada conta
       * 
       * 📚 CONCEITOS APRENDIDOS:
       * - Array iteration patterns em React
       * - Key prop optimization para reconciliation
       * - Conditional rendering para performance
       * - Event delegation em componentes de lista
       * ═══════════════════════════════════════════════════════════════
       */}
      {allSettings.map((el, i) => (
        <HStack
          key={i}
          display={"flex"}
          justifyContent={"start"}
          _hover={{
            cursor: "pointer",
          }}
          onClick={() => onSetActive(el.id)}
        >
          <Box w={"12px"}>
            {el.active ? <FontAwesomeIcon icon={faCheck} /> : null}
          </Box>
          <Text>{el.decoded.sipDisplayName || el.decoded.sipUsername}</Text>
          &nbsp;
          <Text>({`${el.decoded.sipUsername}@${el.decoded.sipDomain}`})</Text>
        </HStack>
      ))}
    </VStack>
  );
}

export default AvailableAccounts;
