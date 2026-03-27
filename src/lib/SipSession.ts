import {
  EndEvent,
  HoldEvent,
  IceCandidateEvent,
  PeerConnectionEvent,
  ReferEvent,
  RTCPeerConnectionDeprecated,
  RTCSession,
} from "jssip/lib/RTCSession";
import { SipConstants, SipAudioElements, randomId } from "./index";
import { DTMF_TRANSPORT } from "jssip/lib/Constants";
import { IncomingResponse } from "jssip/lib/SIPMessage";
import * as events from "events";
import { C, Grammar } from "jssip";
import { auditoriaService } from "../services/auditoriaService";
import RecordRTC from "recordrtc";

export default class SipSession extends events.EventEmitter {
  #id: string;
  #rtcOptions: any;
  #audio: SipAudioElements;
  #rtcSession: RTCSession;
  #active: boolean;
  #callStartTime: string | null = null;
  // Gravação dual WAV
  #recorderAgente: RecordRTC | null = null;
  #recorderCliente: RecordRTC | null = null;
  #agenteBlob: Blob | null = null;
  #clienteBlob: Blob | null = null;

  constructor(
    rtcSession: RTCSession,
    rtcConfig: RTCConfiguration,
    audio: SipAudioElements
  ) {
    super();
    this.setMaxListeners(Infinity);
    this.#id = randomId("");
    this.#rtcOptions = {
      mediaConstraints: { audio: true, video: false },
      pcConfig: rtcConfig,
    };
    this.#rtcSession = rtcSession;
    this.#audio = audio;
    this.#active = false;
    this.addListeners();
  }

  addListeners(): void {
    if (this.#rtcSession.connection) {
      this.addPeerConnectionListener(this.#rtcSession.connection);
    } else {
      this.#rtcSession.on(
        "peerconnection",
        (data: PeerConnectionEvent): void => {
          let pc: RTCPeerConnectionDeprecated = data.peerconnection;
          this.addPeerConnectionListener(pc);
        }
      );
    }

    this.#rtcSession.on("progress", (): void => {
      this.emit(SipConstants.SESSION_RINGING, {
        status: SipConstants.SESSION_RINGING,
      });
      if (this.#audio.isRemoteAudioPaused() && !this.replaces) {
        this.#audio.playRinging(undefined);
      } else {
        this.#audio.playRingback(undefined);
      }
    });

    this.#rtcSession.on(
      "accepted",
      ({ response }: { response: IncomingResponse }) => {
        const callSid = response?.hasHeader("X-Call-Sid")
          ? response.getHeader("X-Call-Sid")
          : null;

        this.emit(SipConstants.SESSION_ANSWERED, {
          status: SipConstants.SESSION_ANSWERED,
          callSid,
        });
        this.#audio.playAnswer(undefined);

        // Marca início da chamada
        this.#callStartTime = new Date().toISOString();

        // Inicia gravação
        this.startRecording();

        // Iniciar tracking de auditoria
        if (auditoriaService.isEnabled()) {
          const direction =
            this.direction === "incoming" ? "inbound" : "outbound";
          auditoriaService
            .startCallTracking(this.#id, this.user, direction)
            .catch((error) => {
              console.error("Erro ao iniciar tracking de auditoria:", error);
            });
        }
      }
    );

    this.#rtcSession.on("failed", (data: EndEvent): void => {
      let { originator, cause, message } = data;
      let description;
      if (
        message &&
        originator === "remote" &&
        message instanceof IncomingResponse &&
        message.status_code
      ) {
        description = `${message.status_code}`.trim();
      }
      if (originator === "local" && cause === C.causes.CANCELED) {
        description = "Cancelled by user";
      }
      if (originator === "local" && cause === C.causes.REJECTED) {
        description = "Rejected by user";
      }
      this.emit(SipConstants.SESSION_FAILED, {
        cause: cause,
        status: SipConstants.SESSION_FAILED,
        originator: originator,
        description: description,
      });
      if (originator === "remote") {
        this.#audio.playFailed(undefined);
      } else {
        this.#audio.pauseRinging();
        this.#audio.pauseRingback();
      }
    });

    this.#rtcSession.on("ended", (data: EndEvent): void => {
      const { originator, cause, message } = data;
      let description;
      if (originator === "remote") {
        this.#audio.playRemotePartyHungup(undefined);
      } else {
        this.#audio.playLocalHungup(undefined);
      }
      if (message && originator === "remote" && message.hasHeader("Reason")) {
        const reason = Grammar.parse(message.getHeader("Reason"), "Reason");
        if (reason) {
          description = `${reason.cause}`.trim();
        }
      }

      // Para gravação e enfileira upload
      this.stopRecording();

      // Finalizar tracking de auditoria
      if (auditoriaService.isEnabled()) {
        auditoriaService.endCallTracking(this.#id).catch((error) => {
          console.error("Erro ao finalizar tracking de auditoria:", error);
        });
      }

      this.emit(SipConstants.SESSION_ENDED, {
        cause: cause,
        status: SipConstants.SESSION_ENDED,
        originator: originator,
        description: description,
      });
    });

    this.#rtcSession.on("muted", (): void => {
      this.emit(SipConstants.SESSION_MUTED, {
        status: "muted",
      });
    });

    this.#rtcSession.on("unmuted", (): void => {
      this.emit(SipConstants.SESSION_MUTED, {
        status: "unmuted",
      });
    });

    this.#rtcSession.on("hold", (data: HoldEvent): void => {
      this.emit(SipConstants.SESSION_HOLD, {
        status: "hold",
        originator: data.originator,
      });
    });

    this.#rtcSession.on("unhold", (data: HoldEvent): void => {
      this.emit(SipConstants.SESSION_HOLD, {
        status: "unhold",
        originator: data.originator,
      });
    });

    this.#rtcSession.on("refer", (data: ReferEvent): void => {
      let { accept } = data;
      accept((rtcSession: RTCSession): void => {
        rtcSession.data.replaces = true;
        this.emit(SipConstants.SESSION_REFER, {
          session: rtcSession,
          type: "refer",
        });
      }, this.#rtcOptions);
    });

    this.#rtcSession.on("replaces", (data: ReferEvent): void => {
      data.accept((rtcSession: RTCSession): void => {
        rtcSession.data.replaces = true;
        if (!rtcSession.isEstablished()) {
          rtcSession.answer(this.#rtcOptions);
          this.emit(SipConstants.SESSION_REPLACES, {
            session: rtcSession,
            type: "replaces",
          });
        }
      });
    });

    this.#rtcSession.on("icecandidate", (evt: IceCandidateEvent): void => {
      let type: string[] = evt.candidate.candidate.split(" ");
      let candidate: string = type[7];
      if (["srflx", "relay"].indexOf(candidate) > -1) {
        evt.ready();
        this.emit(SipConstants.SESSION_ICE_READY, {
          candidate: candidate,
          status: "ready",
        });
      }
    });
  }

  addPeerConnectionListener(pc: RTCPeerConnection): void {
    pc.addEventListener("addstream", (event: any): void => {
      if (this.#rtcSession.direction === "outgoing") {
        this.#audio.pauseRinging();
      }
      this.#audio.playRemote(event.stream);
      this.emit(SipConstants.SESSION_ADD_STREAM, {
        direction: this.#rtcSession.direction,
      });
    });
    // pc.addEventListener(
    //   "track",
    //   (event: RTCPeerConnectionEventMap["track"]): void => {
    //     const stream: MediaStream = new MediaStream([event.track]);
    //     if (this.#rtcSession.direction === "outgoing") {
    //       this.#audio.pauseRinging();
    //     }
    //     this.#audio.playRemote(stream);
    //     this.emit(SipConstants.SESSION_TRACK, {
    //       direction: this.#rtcSession.direction,
    //     });
    //   }
    // );
  }

  get rtcSession() {
    return this.#rtcSession;
  }

  get direction() {
    return this.#rtcSession.direction;
  }

  get id() {
    return this.#id;
  }

  get user() {
    return this.#rtcSession.remote_identity.uri.user;
  }

  get active() {
    return this.#active;
  }

  get answerTime(): Date {
    return this.#rtcSession.start_time;
  }

  get duration() {
    if (!this.answerTime) {
      return 0;
    }
    let now: number = new Date().getUTCMilliseconds();
    return Math.floor((now - this.answerTime.getUTCMilliseconds()) / 1000);
  }

  get replaces() {
    return Boolean(this.#rtcSession.data.replaces);
  }

  setActive(flag: boolean): void {
    let wasActive: boolean = this.#active;
    this.#active = flag;
    if (this.#rtcSession.isEstablished()) {
      if (this.replaces) {
        return;
      }
      if (this.#active) {
        this.unhold();
      } else {
        this.hold();
      }
    }
    if (this.#active && !wasActive) {
      this.emit(SipConstants.SESSION_ACTIVE);
    }
  }

  answer() {
    this.#rtcSession.answer(this.#rtcOptions);
  }

  terminate(sipCode: number, sipReason: string): void {
    this.#rtcSession.terminate({
      status_code: sipCode,
      reason_phrase: sipReason,
    });
  }

  isMuted(): boolean {
    return this.#rtcSession.isMuted().audio?.valueOf() || false;
  }

  mute(): void {
    this.#rtcSession.mute({ audio: true, video: true });
  }

  unmute(): void {
    this.#rtcSession.unmute({ audio: true, video: true });
  }

  isHolded(): boolean {
    return this.#rtcSession.isOnHold().local.valueOf() || false;
  }

  hold(): void {
    this.#rtcSession.hold();
  }

  unhold(): void {
    this.#rtcSession.unhold();
  }

  sendDtmf(tone: number | string): void {
    this.#rtcSession.sendDTMF(tone, { transportType: DTMF_TRANSPORT.RFC2833 });
  }

  /**
   * Inicia gravação dual de áudio da chamada (agente + cliente) em WAV
   */
  startRecording(): void {
    try {
      const pc = this.#rtcSession.connection;
      if (!pc) {
        console.warn("PeerConnection não disponível para gravação");
        return;
      }

      // Obtém tracks de áudio
      const receivers = pc.getReceivers();
      const senders = pc.getSenders();

      // Track remoto (cliente)
      const remoteTrack = receivers.find((r) => r.track.kind === "audio")?.track;
      if (!remoteTrack) {
        console.warn("Track de áudio remoto não encontrado");
        return;
      }

      // Track local (agente)
      const localTrack = senders.find((s) => s.track?.kind === "audio")?.track;
      if (!localTrack) {
        console.warn("Track de áudio local não encontrado");
        // Se não houver track local, continua apenas com remoto
      }

      // Cria streams separados
      const clienteStream = new MediaStream([remoteTrack]);

      // Configura gravador do cliente (áudio remoto)
      this.#recorderCliente = new RecordRTC(clienteStream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1, // Mono
        desiredSampRate: 16000, // 16kHz (bom para transcrição)
        timeSlice: 1000,
      });

      this.#recorderCliente.startRecording();
      console.log("Gravação do cliente iniciada (WAV 16kHz mono)");

      // Se houver track local, grava também
      if (localTrack) {
        const agenteStream = new MediaStream([localTrack]);

        this.#recorderAgente = new RecordRTC(agenteStream, {
          type: "audio",
          mimeType: "audio/wav",
          recorderType: RecordRTC.StereoAudioRecorder,
          numberOfAudioChannels: 1, // Mono
          desiredSampRate: 16000, // 16kHz
          timeSlice: 1000,
        });

        this.#recorderAgente.startRecording();
        console.log("Gravação do agente iniciada (WAV 16kHz mono)");
      }
    } catch (error) {
      console.error("Erro ao iniciar gravação dual:", error);
    }
  }

  /**
   * Para gravação dual de áudio
   */
  stopRecording(): void {
    try {
      if (this.#recorderCliente && this.#recorderCliente.getState() !== "inactive") {
        this.#recorderCliente.stopRecording(() => {
          this.#clienteBlob = this.#recorderCliente!.getBlob();
          console.log("Gravação do cliente parada");
          this.checkAndProcessRecordings();
        });
      }

      if (this.#recorderAgente && this.#recorderAgente.getState() !== "inactive") {
        this.#recorderAgente.stopRecording(() => {
          this.#agenteBlob = this.#recorderAgente!.getBlob();
          console.log("Gravação do agente parada");
          this.checkAndProcessRecordings();
        });
      }
    } catch (error) {
      console.error("Erro ao parar gravação dual:", error);
    }
  }

  /**
   * Verifica se ambas gravações terminaram e processa
   */
  private checkAndProcessRecordings(): void {
    // Espera ambas as gravações terminarem (ou apenas cliente se não houver agente)
    const agenteReady = !this.#recorderAgente || this.#agenteBlob !== null;
    const clienteReady = this.#clienteBlob !== null;

    if (agenteReady && clienteReady) {
      this.handleRecordingComplete().catch((error) => {
        console.error("Erro ao processar gravações:", error);
      });
    }
  }

  /**
   * Processa gravação dual completa e faz upload
   */
  async handleRecordingComplete(): Promise<void> {
    try {
      if (!this.#clienteBlob) {
        console.warn("Gravação do cliente não disponível");
        return;
      }

      // Obtém upload config do storage
      const { getUploadConfig } = await import("../storage/authStorage");
      const uploadConfig = await getUploadConfig();

      if (!uploadConfig || !uploadConfig.apiKey || !uploadConfig.projectId) {
        console.warn(
          "Upload config não disponível - gravação não será enviada"
        );
        return;
      }

      // Calcula duração da chamada
      const now = new Date();
      const startTime = this.#callStartTime
        ? new Date(this.#callStartTime)
        : now;
      const durationSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );

      // Gera timestamp
      const timestamp = Date.now();

      // Obtém número do telefone
      const phoneNumber = this.user || "unknown";

      // Obtém ramal do operador do storage
      const { getUserData } = await import("../storage/authStorage");
      const userData = await getUserData();
      const ramal = userData?.extension?.extensionNumber || "0000";

      // Prepara payload do upload
      const uploadPayload = {
        agenteAudio: this.#agenteBlob || new Blob([], { type: "audio/wav" }),
        clienteAudio: this.#clienteBlob,
        projectId: uploadConfig.projectId,
        apiKey: uploadConfig.apiKey,
        ramal,
        phoneNumber,
        timestamp,
      };

      // Se não houver gravação do agente, loga warning
      if (!this.#agenteBlob) {
        console.warn("Gravação do agente não disponível, enviando apenas cliente");
      }

      // Upload dual
      const { uploadDualAudio } = await import("../api/uploadApi");
      await uploadDualAudio(uploadPayload);

      const baseFilename = `${timestamp}-RAMAL-${ramal}-NUMERO-${phoneNumber}-UNIQUEID-${timestamp}.0`;

      console.log("Gravações WAV dual enviadas com sucesso:", {
        id: this.#id,
        baseFilename,
        agenteSizeMB: this.#agenteBlob ? (this.#agenteBlob.size / 1024 / 1024).toFixed(2) : "0",
        clienteSizeMB: (this.#clienteBlob.size / 1024 / 1024).toFixed(2),
        duration: durationSeconds,
      });

      // Limpa blobs
      this.#agenteBlob = null;
      this.#clienteBlob = null;
      this.#recorderAgente = null;
      this.#recorderCliente = null;
    } catch (error) {
      console.error("Erro ao processar gravações dual:", error);
    }
  }
}
