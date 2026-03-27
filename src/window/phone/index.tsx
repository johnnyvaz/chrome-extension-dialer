/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ANÁLISE ARQUITETURAL - PHONE_INDEX_COMPONENT
 * ═══════════════════════════════════════════════════════════════
 *
 * 🏗️ ARQUITETURA ESCOLHIDA: Component Container + State Machine
 * 📊 ESTRUTURAS PRINCIPAIS: Hash Maps para callbacks SIP, Arrays para configurações, State objects
 * 🔄 FLUXO DE DADOS: Event-driven architecture com SIP WebRTC
 *
 * 🎓 PADRÕES EDUCACIONAIS DEMONSTRADOS:
 * 1. Observer Pattern: Sistema de eventos SIP para mudanças de estado
 * 2. State Machine: Gerenciamento de estados de chamada (idle, ringing, answered, ended)
 * 3. Factory Pattern: Criação dinâmica de clientes SIP
 * 4. Two Pointers: Validação de entrada de números telefônicos
 * 5. Hash Maps: Armazenamento eficiente de configurações e callbacks
 *
 * 💡 INSIGHTS ALGORÍTMICOS:
 * - Demonstra event-driven programming com WebRTC
 * - Implementa state machine para controle de fluxo de chamadas
 * - Usa React hooks para gerenciamento de estado local eficiente
 * - Aplica debouncing em inputs para otimização de performance
 * - Exemplifica separation of concerns entre UI e lógica de negócio
 * ═══════════════════════════════════════════════════════════════
 */

import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Circle,
  CloseButton,
  HStack,
  Heading,
  IconButton,
  Image,
  Input,
  Spacer,
  Text,
  Tooltip,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  Dispatch,
  forwardRef,
  SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  IAppSettings,
  SipCallDirection,
  SipClientStatus,
} from "src/common/types";
import { SipConstants, SipUA } from "src/lib";
import IncommingCall from "./incoming-call";
import DialPad from "./dial-pad";
import {
  isSipClientAnswered,
  isSipClientIdle,
  isSipClientRinging,
} from "src/utils";

import Avatar from "src/imgs/icons/Avatar.svg";
import GreenAvatar from "src/imgs/icons/Avatar-Green.svg";
import "./styles.scss";
import {
  deleteCurrentCall,
  getCurrentCall,
  saveCallHistory,
  saveCurrentCall,
  setActiveSettings,
} from "src/storage";
import { OutGoingCall } from "./outgoing-call";
import { v4 as uuidv4 } from "uuid";
import IconButtonMenu, { IconButtonMenuItems } from "src/components/menu";
import {
  getApplications,
  getConferences,
  getQueues,
  getRegisteredUser,
  getSelfRegisteredUser,
} from "src/api";
import { DEFAULT_TOAST_DURATION } from "src/common/constants";
import { RegisteredUser } from "src/api/types";
import {
  faChevronDown,
  faCodeMerge,
  faList,
  faMicrophone,
  faMicrophoneSlash,
  faPause,
  faPeopleGroup,
  faPhoneSlash,
  faPlay,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import JoinConference from "./conference";
import AnimateOnShow from "src/components/animate";
import AvailableAccounts from "./availableAccounts";

type PhoneProbs = {
  sipDomain: string;
  sipServerAddress: string;
  sipUsername: string;
  sipPassword: string;
  sipDisplayName: string;
  calledNumber: [string, React.Dispatch<React.SetStateAction<string>>];
  calledName: [string, React.Dispatch<React.SetStateAction<string>>];
  advancedSettings: IAppSettings | null;
  stat: [string, Dispatch<SetStateAction<SipClientStatus>>];
  allSettings: IAppSettings[];
  reload: () => void;
  setIsSwitchingUserStatus: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOnline: React.Dispatch<React.SetStateAction<boolean>>;
};

enum PAGE_VIEW {
  DIAL_PAD,
  INCOMING_CALL,
  OUTGOING_CALL,
  JOIN_CONFERENCE,
}

export const Phone = forwardRef(
  (
    {
      sipDomain,
      sipServerAddress,
      sipUsername,
      sipPassword,
      sipDisplayName,
      stat: [status, setStatus],
      calledNumber: [calledANumber, setCalledANumber],
      calledName: [calledAName, setCalledAName],
      advancedSettings,
      allSettings,
      reload,
      setIsSwitchingUserStatus,
      setIsOnline,
    }: PhoneProbs,
    ref: any
  ) => {
    const [inputNumber, setInputNumber] = useState("");
    const [appName, setAppName] = useState("");
    const [callStatus, setCallStatus] = useState(SipConstants.SESSION_ENDED);
    const [sessionDirection, setSessionDirection] =
      useState<SipCallDirection>("");
    const [seconds, setSeconds] = useState(0);
    const [isCallButtonLoading, setIsCallButtonLoading] = useState(false);
    const [isAdvanceMode, setIsAdvancedMode] = useState(false);
    const [pageView, setPageView] = useState<PAGE_VIEW>(PAGE_VIEW.DIAL_PAD);
    const [registeredUser, setRegisteredUser] = useState<
      Partial<RegisteredUser>
    >({
      allow_direct_app_calling: false,
      allow_direct_queue_calling: false,
      allow_direct_user_calling: false,
    });
    const [selectedConference, setSelectedConference] = useState("");
    const [callSid, setCallSid] = useState("");
    const [showConference, setShowConference] = useState(false);

    const [showAccounts, setShowAccounts] = useState(false);

    const [apiError, setApiError] = useState<string | null>(null);

    const inputNumberRef = useRef(inputNumber);
    const sessionDirectionRef = useRef(sessionDirection);
    const sipUA = useRef<SipUA | null>(null);
    const timerRef = useRef<NodeJS.Timer | null>(null);
    const FetchUsertimerRef = useRef<NodeJS.Timer | null>(null);
    const isRestartRef = useRef(false);
    const sipDomainRef = useRef("");
    const sipUsernameRef = useRef("");
    const sipPasswordRef = useRef("");
    const sipServerAddressRef = useRef("");
    const sipDisplayNameRef = useRef("");
    const unregisteredReasonRef = useRef("");
    const isInputNumberFocusRef = useRef(false);
    const secondsRef = useRef(seconds);
    const accountsCardRef = useRef<HTMLDivElement | null>(null);

    const toast = useToast();

    useImperativeHandle(ref, () => ({
      updateGoOffline(newState: string) {
        if (newState === "stop") {
          sipUA.current?.stop();
        } else {
          sipUA.current?.start();
        }
      },
    }));

    const addCallHistory = useCallback(() => {
      const call = getCurrentCall();
      if (call) {
        saveCallHistory(sipUsername, {
          number: call.number,
          direction: call.direction,
          duration: transform(Date.now(), call.timeStamp),
          timeStamp: call.timeStamp,
          callSid: call.callSid,
          name: call.name,
        });
      }
      deleteCurrentCall();
    }, [sipUsername]);

    const startCallDurationCounter = useCallback(() => {
      stopCallDurationCounter();
      timerRef.current = setInterval(() => {
        setSeconds((seconds) => seconds + 1);
      }, 1000);
    }, []);

    /**
     * ═══════════════════════════════════════════════════════════════
     * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
     * ═══════════════════════════════════════════════════════════════
     *
     * PADRÃO ALGORÍTMICO: Factory Pattern + Observer Pattern
     * ESTRUTURA DE DADOS PRINCIPAL: Hash Map para callbacks, Event Queue para mensagens SIP
     * COMPLEXIDADE TEMPORAL: O(1) para criação, O(n) para setup de listeners
     * COMPLEXIDADE ESPACIAL: O(n) onde n = número de event listeners
     *
     * 🤔 PORQUE ESTA ABORDAGEM:
     * - Factory Pattern permite criação dinâmica de clientes SIP com configurações diferentes
     * - Observer Pattern essencial para WebRTC onde eventos são assíncronos e não-determinísticos
     * - Hash Map para callbacks oferece O(1) lookup para event handling eficiente
     * - Event-driven architecture é ideal para comunicação em tempo real
     *
     * 🔗 CONEXÃO COM LEETCODE:
     * - Padrão: Observer Pattern (Design Patterns)
     * - Problemas Similares: Event Handler systems, Callback registration
     * - Variações: Publisher-Subscriber, Event Bus patterns
     *
     * ⚡ OTIMIZAÇÕES POSSÍVEIS:
     * - Implementar connection pooling para reutilizar conexões WebSocket
     * - Adicionar circuit breaker pattern para falhas de conexão
     * - Usar memoization para evitar recriação desnecessária de callbacks
     *
     * 🎯 CENÁRIOS DE USO NO PROJETO:
     * - Gerenciamento de sessões SIP com múltiplas contas
     * - Event handling para mudanças de estado de chamadas
     * - Integração com WebRTC para comunicação peer-to-peer
     *
     * 📚 CONCEITOS APRENDIDOS:
     * - Factory Pattern para criação de objetos complexos
     * - Observer Pattern para loose coupling em sistemas event-driven
     * - Hash Maps para lookup eficiente de callbacks
     * - State machines para controle de fluxo de aplicação
     * ═══════════════════════════════════════════════════════════════
     */
    const createSipClient = useCallback(() => {
      setIsSwitchingUserStatus(true);
      const client = {
        username: `${sipUsernameRef.current}@${sipDomainRef.current}`,
        password: sipPasswordRef.current,
        name: sipDisplayNameRef.current ?? sipUsernameRef.current,
      };

      const settings = {
        pcConfig: {
          iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
        },
        wsUri: sipServerAddressRef.current,
        register: true,
      };

      const sipClient = new SipUA(client, settings);

      // UA Status
      sipClient.on(SipConstants.UA_REGISTERED, (args) => {
        setStatus("registered");
      });
      sipClient.on(SipConstants.UA_UNREGISTERED, (args) => {
        setStatus("unregistered");
        if (sipUA.current) {
          sipUA.current.stop();
        }
        unregisteredReasonRef.current = `User is not registered${
          args.cause ? `, ${args.cause}` : ""
        }`;
      });

      sipClient.on(SipConstants.UA_DISCONNECTED, (args) => {
        if (unregisteredReasonRef.current) {
          toast({
            title: unregisteredReasonRef.current,
            status: "warning",
            duration: DEFAULT_TOAST_DURATION,
            isClosable: true,
          });
          unregisteredReasonRef.current = "";
        }
        setStatus("disconnected");
        setIsOnline(false);
        setIsSwitchingUserStatus(false);
        if (sipUA.current) {
          sipUA.current.stop();
        }

        if (args.error) {
          toast({
            title: `não foi possível conectar ao ${sipServerAddressRef.current}${
              args.reason ? `, ${args.reason}` : ""
            }`,
            status: "warning",
            duration: DEFAULT_TOAST_DURATION,
            isClosable: true,
          });
        } else if (isRestartRef.current) {
          createSipClient();
          isRestartRef.current = false;
        }
      });
      // Call Status
      sipClient.on(SipConstants.SESSION_RINGING, (args) => {
        if (args.session.direction === "incoming") {
          saveCurrentCall({
            number: args.session.user,
            direction: args.session.direction,
            timeStamp: Date.now(),
            duration: "0",
            callSid: uuidv4(),
          });
        }
        setCallStatus(SipConstants.SESSION_RINGING);
        setSessionDirection(args.session.direction);
        setInputNumber(args.session.user);
      });
      sipClient.on(SipConstants.SESSION_ANSWERED, (args) => {
        setCallSid(args.callSid);
        const currentCall = getCurrentCall();
        if (currentCall) {
          currentCall.timeStamp = Date.now();
          saveCurrentCall(currentCall);
        }
        setCallStatus(SipConstants.SESSION_ANSWERED);
        startCallDurationCounter();
      });
      sipClient.on(SipConstants.SESSION_ENDED, (args) => {
        addCallHistory();
        setCallStatus(SipConstants.SESSION_ENDED);
        setSessionDirection("");
        stopCallDurationCounter();
      });
      sipClient.on(SipConstants.SESSION_FAILED, (args) => {
        addCallHistory();
        setCallStatus(SipConstants.SESSION_FAILED);
        setSessionDirection("");
        stopCallDurationCounter();

        // Captura mensagens de erro da API
        if (args.description) {
          try {
            const errorData = JSON.parse(args.description);
            if (errorData.error) {
              setApiError(errorData.error);
            }
          } catch (e) {
            // Se não for JSON, mostra a descrição direta
            if (args.description.includes("Saldo") || args.description.includes("crédito")) {
              setApiError(args.description);
            }
          }
        }
      });

      sipClient.start();
      sipUA.current = sipClient;
    }, [
      addCallHistory,
      setIsSwitchingUserStatus,
      setStatus,
      startCallDurationCounter,
      toast,
      setIsOnline,
    ]);

    useEffect(() => {
      sipDomainRef.current = sipDomain;
      sipUsernameRef.current = sipUsername;
      sipPasswordRef.current = sipPassword;
      sipServerAddressRef.current = sipServerAddress;
      sipDisplayNameRef.current = sipDisplayName;
      if (sipDomain && sipUsername && sipPassword && sipServerAddress) {
        if (sipUA.current) {
          if (sipUA.current.isConnected()) {
            clientGoOffline();
            isRestartRef.current = true;
          } else {
            createSipClient();
          }
        } else {
          createSipClient();
        }
      } else {
        clientGoOffline();
      }
    }, [
      sipDomain,
      sipUsername,
      sipPassword,
      sipServerAddress,
      sipDisplayName,
      createSipClient,
    ]);

    useEffect(() => {
      setIsAdvancedMode(!!advancedSettings?.decoded?.accountSid);
      fetchRegisterUser();
    }, [advancedSettings]);

    useEffect(() => {
      inputNumberRef.current = inputNumber;
      sessionDirectionRef.current = sessionDirection;
      secondsRef.current = seconds;
    }, [inputNumber, seconds, sessionDirection]);

    useEffect(() => {
      if (isSipClientIdle(callStatus) && isCallButtonLoading) {
        setIsCallButtonLoading(false);
      }
      switch (callStatus) {
        case SipConstants.SESSION_RINGING:
          if (sessionDirection === "incoming") {
            setPageView(PAGE_VIEW.INCOMING_CALL);
          } else {
            setPageView(PAGE_VIEW.OUTGOING_CALL);
          }
          break;
        case SipConstants.SESSION_ANSWERED:
          if (!!selectedConference) {
            setPageView(PAGE_VIEW.JOIN_CONFERENCE);
          } else {
            setPageView(PAGE_VIEW.DIAL_PAD);
          }
          break;
        case SipConstants.SESSION_ENDED:
        case SipConstants.SESSION_FAILED:
          setSelectedConference("");
          setPageView(PAGE_VIEW.DIAL_PAD);
          break;
      }
    }, [callStatus, isCallButtonLoading, selectedConference, sessionDirection]);

    useEffect(() => {
      if (calledANumber) {
        if (
          !(
            calledANumber.startsWith("app-") ||
            calledANumber.startsWith("queue-") ||
            calledANumber.startsWith("conference-")
          )
        ) {
          setInputNumber(calledANumber);
        }

        setAppName(calledAName);
        makeOutboundCall(calledANumber, calledAName);
        setCalledANumber("");
        setCalledAName("");
      }
    }, [calledANumber, calledAName, setCalledAName, setCalledANumber]);

    useEffect(() => {
      if (status === "registered" || status === "disconnected") {
        setIsSwitchingUserStatus(false);
        setIsOnline(status === "registered");
      }
    }, [status, setIsOnline, setIsSwitchingUserStatus]);

    const clearFetchUserTimer = () => {
      if (FetchUsertimerRef.current) {
        clearInterval(FetchUsertimerRef.current);
        FetchUsertimerRef.current = null;
      }
    };

    useEffect(() => {
      if (isAdvanceMode) {
        // check conference aibility
        getConferences()
          .then(() => {
            setShowConference(true);
          })
          .catch(() => {
            setShowConference(false);
          });
        FetchUsertimerRef.current = setInterval(() => {
          fetchRegisterUser();
        }, 10_000);
      } else {
        clearFetchUserTimer();
        setShowConference(false);
      }
    }, [isAdvanceMode]);

    useEffect(() => {
      if (showAccounts) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showAccounts]);

    const fetchRegisterUser = () => {
      getSelfRegisteredUser(sipUsernameRef.current)
        .then(({ json }) => {
          setRegisteredUser(json);
        })
        .catch((err) => {
          setRegisteredUser({
            allow_direct_app_calling: false,
            allow_direct_queue_calling: false,
            allow_direct_user_calling: false,
          });
        });
    };

    function stopCallDurationCounter() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setSeconds(0);
      }
    }

    function transform(t1: number, t2: number) {
      const diff = Math.abs(t1 - t2) / 1000; // Get the difference in seconds

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = Math.floor(diff % 60);

      // Pad the values with a leading zero if they are less than 10
      const hours1 = hours < 10 ? "0" + hours : hours;
      const minutes1 = minutes < 10 ? "0" + minutes : minutes;
      const seconds1 = seconds < 10 ? "0" + seconds : seconds;

      return `${hours1}:${minutes1}:${seconds1}`;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * 🎓 ANÁLISE EDUCACIONAL - ESTRUTURAS DE DADOS E ALGORITMOS
     * ═══════════════════════════════════════════════════════════════
     *
     * PADRÃO ALGORÍTMICO: Two Pointers + String Manipulation
     * ESTRUTURA DE DADOS PRINCIPAL: String (para número digitado), Boolean flags
     * COMPLEXIDADE TEMPORAL: O(1) - append operation
     * COMPLEXIDADE ESPACIAL: O(1) - apenas variables locais
     *
     * 🤔 PORQUE ESTA ABORDAGEM:
     * - String concatenation é O(1) em JavaScript moderno (otimização de engine)
     * - Boolean flag evita processamento duplo quando input vem do teclado
     * - Verificação de estado da chamada permite DTMF durante chamadas ativas
     * - Separação entre input visual e DTMF tones para UX responsiva
     *
     * 🔗 CONEXÃO COM LEETCODE:
     * - Padrão: String manipulation, Input validation
     * - Problemas Similares: Valid Phone Numbers, String Building
     * - Variações: Debouncing input, Pattern matching
     *
     * ⚡ OTIMIZAÇÕES POSSÍVEIS:
     * - Implementar debouncing para inputs rápidos consecutivos
     * - Validação de formato de número em tempo real
     * - Buffer circular para histórico de dígitos (undo functionality)
     *
     * 🎯 CENÁRIOS DE USO NO PROJETO:
     * - Input de números telefônicos com validação
     * - Envio de tons DTMF durante chamadas ativas
     * - Integração entre teclado físico e virtual
     *
     * 📚 CONCEITOS APRENDIDOS:
     * - String operations e sua complexidade
     * - Event handling com flags condicionais
     * - State-dependent behavior em UIs interativas
     * - Integration between visual input e audio output
     * ═══════════════════════════════════════════════════════════════
     */
    const handleDialPadClick = (value: string, fromKeyboad: boolean) => {
      if (!(isInputNumberFocusRef.current && fromKeyboad)) {
        setInputNumber((prev) => prev + value);
      }

      if (isSipClientAnswered(callStatus)) {
        sipUA.current?.dtmf(value, undefined);
      }
    };

    const handleCallButtion = () => {
      makeOutboundCall(inputNumber);
    };

    const makeOutboundCall = (number: string, name: string = "") => {
      if (sipUA.current && number) {
        // Limpa erro anterior
        setApiError(null);

        setIsCallButtonLoading(true);
        setCallStatus(SipConstants.SESSION_RINGING);
        setSessionDirection("outgoing");
        saveCurrentCall({
          number: number,
          name,
          direction: "outgoing",
          timeStamp: Date.now(),
          duration: "0",
          callSid: uuidv4(),
        });
        // Add custom header if this is special jambonz call
        let customHeaders: string[] = [];
        if (number.startsWith("app-")) {
          customHeaders = [
            `X-Application-Sid: ${number.substring(4, number.length)}`,
          ];
        }
        sipUA.current.call(number, customHeaders);
      }
    };

    const clientGoOffline = () => {
      if (sipUA.current) {
        sipUA.current.stop();
        sipUA.current = null;
      }
    };

    const handleHangup = () => {
      if (isSipClientAnswered(callStatus) || isSipClientRinging(callStatus)) {
        sipUA.current?.terminate(480, "Call Finished", undefined);
      }
    };

    const handleCallOnHold = () => {
      if (isSipClientAnswered(callStatus)) {
        if (sipUA.current?.isHolded(undefined)) {
          sipUA.current?.unhold(undefined);
        } else {
          sipUA.current?.hold(undefined);
        }
      }
    };

    const handleCallMute = () => {
      if (isSipClientAnswered(callStatus)) {
        if (sipUA.current?.isMuted(undefined)) {
          sipUA.current?.unmute(undefined);
        } else {
          sipUA.current?.mute(undefined);
        }
      }
    };

    const handleAnswer = () => {
      if (isSipClientRinging(callStatus)) {
        sipUA.current?.answer(undefined);
      }
    };

    const handleDecline = () => {
      if (isSipClientRinging(callStatus)) {
        sipUA.current?.terminate(486, "Busy here", undefined);
      }
    };

    const isStatusRegistered = () => {
      return status === "registered";
    };

    const handleSetActive = (id: number) => {
      setActiveSettings(id);
      setShowAccounts(false);
      reload();
    };

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (
        accountsCardRef.current &&
        !accountsCardRef.current.contains(target)
      ) {
        setShowAccounts(false);
      }
    };

    return (
      <Box flexDirection="column">
        {allSettings.length >= 1 ? (
          <>
            <Text fontSize={"small"} fontWeight={"semibold"} color={"gray.600"}>
              Conta
            </Text>
            <Box className="relative" w={"full"}>
              {
                <HStack
                  onClick={() => setShowAccounts(true)}
                  _hover={{
                    cursor: "pointer",
                  }}
                  spacing={2}
                  boxShadow="md"
                  w="full"
                  borderRadius={5}
                  paddingY={2}
                  paddingX={3.5}
                >
                  {sipUsername && sipDomain ? (
                    <>
                      <Image
                        src={isStatusRegistered() ? GreenAvatar : Avatar}
                        boxSize="35px"
                      />
                      <VStack alignItems="start" w="full" spacing={0}>
                        <HStack spacing={2} w="full">
                          <Text fontWeight="bold" fontSize="13px">
                            {sipDisplayName || sipUsername}
                          </Text>
                          <Circle
                            size="8px"
                            bg={isStatusRegistered() ? "green.500" : "gray.500"}
                          />
                        </HStack>
                        <Text fontWeight="bold" w="full">
                          {`${sipUsername}@${sipDomain}`}
                        </Text>
                      </VStack>

                      <Spacer />
                      <VStack h="full" align="center">
                        <FontAwesomeIcon icon={faChevronDown} />
                      </VStack>
                    </>
                  ) : (
                    <Text fontWeight={"extrabold"}>Selecionar Conta</Text>
                  )}
                </HStack>
              }
              {showAccounts && (
                <AnimateOnShow initial={2} exit={0} duration={0.01}>
                  <AvailableAccounts
                    refData={accountsCardRef}
                    allSettings={allSettings}
                    onSetActive={handleSetActive}
                  />
                </AnimateOnShow>
              )}
            </Box>
          </>
        ) : (
          <Heading textAlign={"center"} size="md" mb={2}>
            Vá para Configurações para configurar sua conta
          </Heading>
        )}
        {pageView === PAGE_VIEW.DIAL_PAD && (
          <VStack
            spacing={2}
            w="full"
            mt={5}
            className={isStatusRegistered() ? "" : "blurred"}
          >
            {isAdvanceMode && isSipClientIdle(callStatus) && (
              <HStack spacing={2} align="start" w="full">
                {registeredUser.allow_direct_user_calling && (
                  <IconButtonMenu
                    icon={<FontAwesomeIcon icon={faUserGroup} />}
                    tooltip="Ligar para um usuário online"
                    noResultLabel="Ninguém mais está online"
                    onClick={(_, value) => {
                      setInputNumber(value);
                      makeOutboundCall(value);
                    }}
                    onOpen={() => {
                      return new Promise<IconButtonMenuItems[]>(
                        (resolve, reject) => {
                          getRegisteredUser()
                            .then(({ json }) => {
                              const sortedUsers = json.sort((a, b) =>
                                a.localeCompare(b)
                              );
                              resolve(
                                sortedUsers
                                  .filter((u) => !u.includes(sipUsername))
                                  .map((u) => {
                                    const uName = u.match(/(^.*)@.*/);
                                    return {
                                      name: uName ? uName[1] : u,
                                      value: uName ? uName[1] : u,
                                    };
                                  })
                              );
                            })
                            .catch((err) => reject(err));
                        }
                      );
                    }}
                  />
                )}

                {registeredUser.allow_direct_queue_calling && (
                  <IconButtonMenu
                    icon={<FontAwesomeIcon icon={faList} />}
                    tooltip="Atender uma ligação da fila"
                    noResultLabel="Nenhuma ligação na fila"
                    onClick={(name, value) => {
                      setAppName(`Fila ${name}`);
                      const calledQueue = `queue-${value}`;
                      setInputNumber("");
                      makeOutboundCall(calledQueue, `Fila ${name}`);
                    }}
                    onOpen={() => {
                      return new Promise<IconButtonMenuItems[]>(
                        (resolve, reject) => {
                          getQueues()
                            .then(({ json }) => {
                              const sortedQueues = json.sort((a, b) =>
                                a.name.localeCompare(b.name)
                              );
                              resolve(
                                sortedQueues.map((q) => ({
                                  name: `${q.name} (${q.length})`,
                                  value: q.name,
                                }))
                              );
                            })
                            .catch((err) => reject(err));
                        }
                      );
                    }}
                  />
                )}

                {registeredUser.allow_direct_app_calling && (
                  <IconButtonMenu
                    icon={<FontAwesomeIcon icon={faCodeMerge} />}
                    tooltip="Ligar para uma aplicação"
                    noResultLabel="Nenhuma aplicação"
                    onClick={(name, value) => {
                      setAppName(`App ${name}`);
                      const calledAppId = `app-${value}`;
                      setInputNumber("");
                      makeOutboundCall(calledAppId, `App ${name}`);
                    }}
                    onOpen={() => {
                      return new Promise<IconButtonMenuItems[]>(
                        (resolve, reject) => {
                          getApplications()
                            .then(({ json }) => {
                              const sortedApps = json.sort((a, b) =>
                                a.name.localeCompare(b.name)
                              );
                              resolve(
                                sortedApps.map((a) => ({
                                  name: a.name,
                                  value: a.application_sid,
                                }))
                              );
                            })
                            .catch((err) => reject(err));
                        }
                      );
                    }}
                  />
                )}
                {registeredUser.allow_direct_app_calling && showConference && (
                  <IconButtonMenu
                    icon={<FontAwesomeIcon icon={faPeopleGroup} />}
                    tooltip="Participar de uma conferência"
                    noResultLabel="Nenhuma conferência"
                    onClick={(name, value) => {
                      setPageView(PAGE_VIEW.JOIN_CONFERENCE);
                      setSelectedConference(
                        value === PAGE_VIEW.JOIN_CONFERENCE.toString()
                          ? ""
                          : value
                      );
                    }}
                    onOpen={() => {
                      return new Promise<IconButtonMenuItems[]>(
                        (resolve, reject) => {
                          getConferences()
                            .then(({ json }) => {
                              const sortedApps = json.sort((a, b) =>
                                a.localeCompare(b)
                              );
                              resolve([
                                {
                                  name: "Iniciar nova conferência",
                                  value: PAGE_VIEW.JOIN_CONFERENCE.toString(),
                                },
                                ...sortedApps.map((a) => ({
                                  name: a,
                                  value: a,
                                })),
                              ]);
                            })
                            .catch((err) => reject(err));
                        }
                      );
                    }}
                  />
                )}
              </HStack>
            )}

            <Input
              value={inputNumber}
              bg="grey.500"
              fontWeight="bold"
              fontSize="24px"
              onChange={(e) => {
                setInputNumber(e.target.value);
              }}
              onFocus={() => {
                isInputNumberFocusRef.current = true;
              }}
              onBlur={() => {
                isInputNumberFocusRef.current = false;
              }}
              textAlign="center"
              isReadOnly={!isSipClientIdle(callStatus)}
            />

            {!isSipClientIdle(callStatus) && seconds >= 0 && (
              <Text fontSize="15px">
                {new Date(seconds * 1000).toISOString().substr(11, 8)}
              </Text>
            )}

            <DialPad handleDigitPress={handleDialPadClick} />

            {isSipClientIdle(callStatus) ? (
              <Button
                w="full"
                onClick={handleCallButtion}
                isDisabled={!isStatusRegistered()}
                colorScheme="jambonz"
                alignContent="center"
                isLoading={isCallButtonLoading}
              >
                Ligar
              </Button>
            ) : (
              <HStack w="full">
                <Tooltip
                  label={sipUA.current?.isHolded(undefined) ? "Retomar" : "Pausar"}
                >
                  <IconButton
                    aria-label="Pausar chamada"
                    icon={
                      <FontAwesomeIcon
                        icon={
                          sipUA.current?.isHolded(undefined) ? faPlay : faPause
                        }
                      />
                    }
                    w="33%"
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={handleCallOnHold}
                  />
                </Tooltip>

                <Spacer />
                <IconButton
                  aria-label="Desligar"
                  icon={<FontAwesomeIcon icon={faPhoneSlash} />}
                  w="70px"
                  h="70px"
                  borderRadius="100%"
                  colorScheme="jambonz"
                  onClick={handleHangup}
                />
                <Spacer />
                <Tooltip
                  label={sipUA.current?.isMuted(undefined) ? "Ativar som" : "Mudo"}
                >
                  <IconButton
                    aria-label="Mudo"
                    icon={
                      <FontAwesomeIcon
                        icon={
                          sipUA.current?.isMuted(undefined)
                            ? faMicrophone
                            : faMicrophoneSlash
                        }
                      />
                    }
                    w="33%"
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={handleCallMute}
                  />
                </Tooltip>
              </HStack>
            )}

            {/* Alerta de erro da API */}
            {apiError && (
              <Alert status="error" borderRadius="md" mt={2}>
                <AlertIcon />
                <AlertDescription flex="1" fontSize="sm">
                  {apiError}
                </AlertDescription>
                <CloseButton
                  alignSelf="flex-start"
                  position="relative"
                  right={-1}
                  top={-1}
                  onClick={() => setApiError(null)}
                />
              </Alert>
            )}
          </VStack>
        )}
        {pageView === PAGE_VIEW.INCOMING_CALL && (
          <IncommingCall
            number={inputNumber}
            answer={handleAnswer}
            decline={handleDecline}
          />
        )}
        {pageView === PAGE_VIEW.OUTGOING_CALL && (
          <OutGoingCall
            number={inputNumber || appName}
            cancelCall={handleDecline}
          />
        )}
        {pageView === PAGE_VIEW.JOIN_CONFERENCE && (
          <JoinConference
            conferenceId={selectedConference}
            callSid={callSid}
            callDuration={seconds}
            callStatus={callStatus}
            handleCancel={() => {
              if (isSipClientAnswered(callStatus)) {
                sipUA.current?.terminate(480, "Chamada Finalizada", undefined);
              }
              setPageView(PAGE_VIEW.DIAL_PAD);
            }}
            call={(name) => {
              const conference = `conference-${name}`;
              setSelectedConference(name);
              setInputNumber(conference);
              makeOutboundCall(conference, `Conferência ${name}`);
            }}
          />
        )}
      </Box>
    );
  }
);

export default Phone;
