/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - OUTGOING_CALL_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: Stateless Functional Component + String Processing
 * 📊 ESTRUTURAS PRINCIPAIS: String para número/nome, Single callback para cancelamento
 * 🔄 FLUXO DE DADOS: Unidirectional data flow com props e callback
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. Pure Function Component: Sem state interno, apenas props rendering
 * 2. String Processing: Formatação de número telefônico para display
 * 3. Single Responsibility: Componente foca apenas em mostrar estado de chamada
 * 4. Callback Pattern: Event propagation para componente pai
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - Minimal component design para máxima reutilização
 * - String formatting utility para consistent display
 * - Single action pattern para simplified user interaction
 * - Stateless design para predictable behavior
 * ═══════════════════════════════════════════════════════════════
 */

import { Box, Button, Icon, Text, VStack } from "@chakra-ui/react";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatPhoneNumber } from "src/utils";

type OutGoingCallProbs = {
  number: string;
  cancelCall: () => void;
};

export const OutGoingCall = ({ number, cancelCall }: OutGoingCallProbs) => {
  return (
    <VStack alignItems="center" spacing={4} mt="130px" w="full">
      <Box
        as={FontAwesomeIcon}
        icon={faPhone}
        color="jambonz.500"
        width="60px"
        height="60px"
      />
      <Text fontSize="15px">Discando</Text>
      <Text fontSize="24px" fontWeight="bold">
        {formatPhoneNumber(number)}
      </Text>

      <Button w="full" colorScheme="jambonz" onClick={cancelCall}>
        Cancelar
      </Button>
    </VStack>
  );
};

export default OutGoingCall;
