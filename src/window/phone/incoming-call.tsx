/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - INCOMING_CALL_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: Functional Component + Event Handling + String Processing
 * 📊 ESTRUTURAS PRINCIPAIS: String para número telefônico, Callbacks para ações
 * 🔄 FLUXO DE DADOS: Props-driven com callback propagation para componente pai
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. String Processing: Formatação de números telefônicos
 * 2. Callback Pattern: Propagação de eventos para componente pai
 * 3. Component Composition: Separation of concerns entre display e logic
 * 4. Pure Functions: Component sem side effects, apenas renderização
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - String formatting para melhor UX (readability de números)
 * - Callback pattern para loose coupling entre componentes
 * - Pure component para predictable rendering e easy testing
 * - Minimal state para reduced complexity
 * ═══════════════════════════════════════════════════════════════
 */

import {
  Button,
  VStack,
  Text,
  Icon,
  HStack,
  Spacer,
  Box,
} from "@chakra-ui/react";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatPhoneNumber } from "src/utils";

type IncommingCallProbs = {
  number: string;
  answer: () => void;
  decline: () => void;
};

export const IncommingCall = ({
  number,
  answer,
  decline,
}: IncommingCallProbs) => {
  return (
    <VStack alignItems="center" spacing={4} mt="130px" w="full">
      <Box
        as={FontAwesomeIcon}
        icon={faPhone}
        color="jambonz.500"
        width="30px"
        height="30px"
      />
      <Text fontSize="15px">Chamada recebida de</Text>
      <Text fontSize="24px" fontWeight="bold">
        {formatPhoneNumber(number)}
      </Text>

      <HStack w="full">
        <Button w="full" colorScheme="jambonz" onClick={decline}>
          Recusar
        </Button>

        <Spacer />
        <Button w="full" colorScheme="green" onClick={answer}>
          Atender
        </Button>
      </HStack>
    </VStack>
  );
};

export default IncommingCall;
