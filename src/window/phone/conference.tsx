/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - CONFERENCE_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARQUITETURA ESCOLHIDA: State Machine + Form Management + API Integration
 * 📊 ESTRUTURAS PRINCIPAIS: State objects, Enum para modos, Hash Map para configurações
 * 🔄 FLUXO DE DADOS: Bidirectional com API calls e local state persistence
 * 
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. State Machine: Gerenciamento de estados de conferência (joining, active, ended)
 * 2. Enum Pattern: ConferenceModes para type-safe mode selection
 * 3. Hash Map: Storage de configurações para persistência local
 * 4. Observer Pattern: useEffect para reação a mudanças de estado
 * 5. Strategy Pattern: Diferentes behaviors baseados no modo da conferência
 * 
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - State machine para controle de fluxo de conferência
 * - Local storage como cache para configurações de usuário
 * - Enum para type safety e reduced bugs
 * - Async operations com proper error handling
 * - Form validation com controlled components
 * ═══════════════════════════════════════════════════════════════
 */

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FormEvent, useEffect, useState } from "react";
import { updateConferenceParticipantAction } from "src/api";
import { ConferenceModes } from "src/api/types";
import { DEFAULT_TOAST_DURATION } from "src/common/constants";
import OutlineBox from "src/components/outline-box";
import { SipConstants } from "src/lib";
import {
  deleteConferenceSettings,
  getConferenceSettings,
  saveConferenceSettings,
} from "src/storage";

type JoinConferenceProbs = {
  conferenceId?: string;
  callSid: string;
  callDuration: number;
  callStatus: string;
  handleCancel: () => void;
  call: (conference: string) => void;
};
export const JoinConference = ({
  conferenceId,
  callSid,
  callDuration,
  callStatus,
  handleCancel,
  call,
}: JoinConferenceProbs) => {
  const toast = useToast();
  const [conferenceName, setConferenceName] = useState(conferenceId || "");
  const [appTitle, setAppTitle] = useState(
    !!conferenceId ? "Entrando na Conferência" : "Iniciar Conferência"
  );
  const [submitTitle, setSubmitTitle] = useState(
    !!conferenceId ? "Entrando na Conferência" : "Iniciar Conferência"
  );

  const [cancelTitle, setCancelTitle] = useState("Cancelar");
  const [isLoading, setIsLoading] = useState(false);
  const confSettings = getConferenceSettings();
  const [speakOnlyTo, setSpeakOnlyTo] = useState(
    confSettings.speakOnlyTo || ""
  );
  const [tags, setTags] = useState(confSettings.tags || "");
  const [mode, setMode] = useState<ConferenceModes>(
    confSettings.mode || "full_participant"
  );
  const [participantState, setParticipantState] = useState("Participar como");

  useEffect(() => {
    switch (callStatus) {
      case SipConstants.SESSION_ANSWERED:
        setAppTitle("Conferência");
        setSubmitTitle("Atualizar");
        setCancelTitle("Desligar");
        setParticipantState("Estado do participante");
        setIsLoading(false);
        configureConferenceSession();
        break;
      case SipConstants.SESSION_ENDED:
      case SipConstants.SESSION_FAILED:
        setIsLoading(false);
        deleteConferenceSettings();
        break;
    }
  }, [callStatus]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (callStatus !== SipConstants.SESSION_ANSWERED) {
      call(conferenceName);
      if (!callSid) {
        setIsLoading(true);
      }
    } else {
      configureConferenceSession();
    }
  };

  const configureConferenceSession = async () => {
    const confSettings = getConferenceSettings();
    if (callSid) {
      if (confSettings.mode) {
        updateConferenceParticipantAction(callSid, {
          action: confSettings.mode === "muted" ? "mute" : "unmute",
          tag: "",
        })
          .then(() => {
            updateConferenceParticipantAction(callSid, {
              action: mode === "coach" ? "coach" : "uncoach",
              tag: confSettings.speakOnlyTo,
            }).catch((error) => {
              toast({
                title: error.msg,
                status: "error",
                duration: DEFAULT_TOAST_DURATION,
                isClosable: true,
              });
            });
          })
          .catch((error) => {
            toast({
              title: error.msg,
              status: "error",
              duration: DEFAULT_TOAST_DURATION,
              isClosable: true,
            });
          });
      }

      if (confSettings.tags) {
        updateConferenceParticipantAction(callSid, {
          action: tags ? "tag" : "untag",
          tag: tags,
        }).catch((error) => {
          toast({
            title: error.msg,
            status: "error",
            duration: DEFAULT_TOAST_DURATION,
            isClosable: true,
          });
        });
      }
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="full">
      <VStack spacing={4} mt="20px" w="full">
        <Text fontWeight="bold" fontSize="lg">
          {appTitle}
        </Text>
        {callDuration > 0 && (
          <Text fontSize="15px">
            {new Date(callDuration * 1000).toISOString().substr(11, 8)}
          </Text>
        )}
        <FormControl id="conference_name">
          <FormLabel>Nome da conferência</FormLabel>
          <Input
            type="text"
            placeholder="Nome"
            isRequired
            value={conferenceName}
            onChange={(e) => setConferenceName(e.target.value)}
            disabled={!!conferenceId}
          />
        </FormControl>

        <OutlineBox title={participantState}>
          <RadioGroup
            onChange={(e) => {
              setMode(e as ConferenceModes);
              saveConferenceSettings({
                mode: e as ConferenceModes,
                speakOnlyTo,
                tags,
              });
            }}
            value={mode}
            colorScheme="jambonz"
          >
            <VStack align="start">
              <Radio value="full_participant" variant="">
                Participante completo
              </Radio>
              <Radio value="muted">Mudo</Radio>
              <Radio value="coach">Modo treinador</Radio>
            </VStack>
          </RadioGroup>

          <FormControl id="speak_only_to">
            <FormLabel>Falar apenas com</FormLabel>
            <Input
              type="text"
              placeholder="tag"
              value={speakOnlyTo}
              onChange={(e) => {
                setSpeakOnlyTo(e.target.value);
                saveConferenceSettings({
                  mode,
                  speakOnlyTo: e.target.value,
                  tags,
                });
              }}
              disabled={mode !== "coach"}
              required={mode === "coach"}
            />
          </FormControl>

          <FormControl id="tag">
            <FormLabel>Etiqueta</FormLabel>
            <Input
              type="text"
              placeholder="tag"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                saveConferenceSettings({
                  mode,
                  speakOnlyTo,
                  tags: e.target.value,
                });
              }}
            />
          </FormControl>
        </OutlineBox>
        <HStack w="full">
          <Button
            colorScheme="jambonz"
            type="submit"
            w="full"
            isLoading={isLoading}
          >
            {submitTitle}
          </Button>

          <Button
            colorScheme="grey"
            type="button"
            w="full"
            textColor="black"
            onClick={() => {
              deleteConferenceSettings();
              handleCancel();
            }}
          >
            {cancelTitle}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default JoinConference;
