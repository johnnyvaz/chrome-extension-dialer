/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - DIAL_PAD_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: Grid Layout + Event Handling + Observer Pattern
 * 📊 ESTRUTURAS PRINCIPAIS: 2D Array para layout de botões, Observer para visibilidade
 * 🔄 FLUXO DE DADOS: Event-driven com propagação de eventos para componente pai
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. 2D Array: Matriz para representar layout de teclado telefônico
 * 2. Observer Pattern: IntersectionObserver para otimização de performance
 * 3. Event Delegation: Unified event handling para múltiplos botões
 * 4. Factory Pattern: Instância única de audio elements para eficiência
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - Array 2D para representação eficiente de grid layout
 * - Observer pattern para lazy loading e performance optimization
 * - Event delegation reduz memory footprint vs individual listeners
 * - Single audio instance evita overhead de múltiplos objetos Audio
 * ═══════════════════════════════════════════════════════════════
 */

import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import DialPadAudioElements from "./DialPadSoundElement";
import { useEffect, useRef } from "react";

type DialPadProbs = {
  handleDigitPress: (digit: string, fromKeyboard: boolean) => void;
};

const keySounds = new DialPadAudioElements();

export const DialPad = ({ handleDigitPress }: DialPadProbs) => {
  const selfRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(false);
  /**
   * ═══════════════════════════════════════════════════════════════
   * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
   * ═══════════════════════════════════════════════════════════════
   * 
   * PADRÃO ALGORÍTMICO: 2D Array (Matrix) + Grid Layout
   * ESTRUTURA DE DADOS PRINCIPAL: Array bidimensional (4x3 matrix)
   * COMPLEXIDADE TEMPORAL: O(1) para acesso, O(n*m) para renderização
   * COMPLEXIDADE ESPACIAL: O(n*m) onde n=rows, m=columns
   * 
   * 🤔 PORQUE ESTA ABORDAGEM:
   * - 2D Array representa naturalmente layout de teclado telefônico
   * - Acesso O(1) para qualquer botão via índices [row][col]
   * - Fácil de iterar com nested loops para renderização
   * - Estrutura reflete organização visual do componente
   * 
   * 🔗 CONEXÃO COM LEETCODE:
   * - Padrão: 2D Array/Matrix problems
   * - Problemas Similares: Matrix Traversal, Grid Search
   * - Variações: Spiral Matrix, Matrix Rotation
   * 
   * ⚡ OTIMIZAÇÕES POSSÍVEIS:
   * - Flatten para 1D array se ordem for mais importante que posição
   * - Usar Map/Set para lookup rápido de caracteres válidos
   * - Pré-computar índices para navegação com setas
   * 
   * 🎯 CENÁRIOS DE USO NO PROJETO:
   * - Layout responsivo de teclado numérico
   * - Navegação por teclado físico (accessibility)
   * - Validação de entrada de dígitos telefônicos
   * 
   * 📚 CONCEITOS APRENDIDOS:
   * - Arrays 2D para representação de grids
   * - Nested iteration para rendering
   * - Mapping data structure to UI layout
   * - Performance considerations em estruturas bidimensionais
   * ═══════════════════════════════════════════════════════════════
   */
  const buttons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#"].includes(
        e.key
      )
    ) {
      if (isVisibleRef.current) {
        keySounds?.playKeyTone(e.key);
        handleDigitPress(e.key, true);
      }
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      {
        threshold: 0.5,
      }
    );
    if (selfRef.current) {
      observer.observe(selfRef.current);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (selfRef.current) {
        observer.unobserve(selfRef.current);
      }
    };
  }, []);

  return (
    <Box p={2} w="full" h="280px" ref={selfRef}>
      <VStack w="full" h="full" bg="grey.500" spacing={0.5}>
        {buttons.map((row, rowIndex) => (
          <HStack
            key={rowIndex}
            justifyContent="space-between"
            spacing={0.5}
            w="full"
            h="full"
          >
            {row.map((num) => (
              <Button
                key={num}
                onClick={() => {
                  keySounds?.playKeyTone(num);
                  handleDigitPress(num, false);
                }}
                size="lg"
                p={0}
                width="calc(100% / 3)"
                height="100%"
                variant="unstyled"
                bg="white"
                _hover={{
                  bg: "gray.100",
                }}
                borderRadius={0}
              >
                {num}
              </Button>
            ))}
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};

export default DialPad;
