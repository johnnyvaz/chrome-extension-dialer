interface CallData {
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  callDirection: 'inbound' | 'outbound';
  callSid?: string;
  metadata: {
    userAgent: string;
    callerId?: string;
    transferredFrom?: string;
    extensionId?: string;
  };
}

interface AuditoriaConfig {
  backendUrl: string;
  projetoId: string;
  authToken?: string;
  enabled: boolean;
  asteriskConfig?: {
    url: string;
    username: string;
    password: string;
    timeout?: number;
  };
}

interface CallSession {
  sessionId: string;
  auditoriaId?: string;
  callDataId?: string;
  callData: Partial<CallData>;
  recordingBlob?: Blob;
}

class AuditoriaService {
  private config: AuditoriaConfig;
  private activeCalls: Map<string, CallSession>;

  constructor() {
    this.activeCalls = new Map();
    this.config = {
      backendUrl: 'http://localhost:3001/api',
      projetoId: '',
      enabled: false
    };
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['auditoriaConfig']);
        if (stored.auditoriaConfig) {
          this.config = { ...this.config, ...stored.auditoriaConfig };
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de auditoria:', error);
    }
  }

  public async updateConfig(newConfig: Partial<AuditoriaConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ auditoriaConfig: this.config });
    }
  }

  public async startCallTracking(sessionId: string, phoneNumber: string, direction: 'inbound' | 'outbound'): Promise<void> {
    if (!this.config.enabled || !this.config.projetoId) {
      console.log('Auditoria desabilitada ou projeto não configurado');
      return;
    }

    const callData: Partial<CallData> = {
      phoneNumber,
      startTime: new Date().toISOString(),
      callDirection: direction,
      metadata: {
        userAgent: navigator.userAgent || 'Unknown',
        extensionId: (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime.id : 'Unknown'
      }
    };

    const callSession: CallSession = {
      sessionId,
      callData
    };

    this.activeCalls.set(sessionId, callSession);

    try {
      // Criar auditoria no backend
      const auditoriaResponse = await this.createAuditoria();
      if (auditoriaResponse.auditoriaId) {
        callSession.auditoriaId = auditoriaResponse.auditoriaId;
        console.log(`Auditoria criada: ${auditoriaResponse.auditoriaId} para ligação ${sessionId}`);
      }
    } catch (error) {
      console.error('Erro ao criar auditoria:', error);
    }
  }

  public async endCallTracking(sessionId: string, callSid?: string): Promise<void> {
    const callSession = this.activeCalls.get(sessionId);
    if (!callSession || !this.config.enabled) {
      return;
    }

    // Finalizar dados da chamada
    callSession.callData.endTime = new Date().toISOString();
    if (callSession.callData.startTime && callSession.callData.endTime) {
      const startTime = new Date(callSession.callData.startTime);
      const endTime = new Date(callSession.callData.endTime);
      callSession.callData.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }

    if (callSid) {
      callSession.callData.metadata = {
        ...callSession.callData.metadata!,
        callerId: callSid
      };
    }

    try {
      // Enviar dados da chamada para o backend
      if (callSession.auditoriaId) {
        const callDataResponse = await this.sendCallData(callSession.auditoriaId, callSession.callData as CallData);
        if (callDataResponse.callDataId) {
          callSession.callDataId = callDataResponse.callDataId;
          console.log(`Dados da ligação enviados: ${callDataResponse.callDataId}`);
        }

        // Tentar buscar gravação no Asterisk (se configurado)
        await this.searchAndSendRecording(callSession);
      }
    } catch (error) {
      console.error('Erro ao finalizar tracking da ligação:', error);
    } finally {
      this.activeCalls.delete(sessionId);
    }
  }

  private async createAuditoria(): Promise<{ auditoriaId?: string }> {
    const response = await fetch(`${this.config.backendUrl}/auditorias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
      },
      body: JSON.stringify({
        projetoId: this.config.projetoId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar auditoria: ${response.statusText}`);
    }

    return await response.json();
  }

  private async sendCallData(auditoriaId: string, callData: CallData): Promise<{ callDataId?: string }> {
    const response = await fetch(`${this.config.backendUrl}/auditorias/chrome-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
      },
      body: JSON.stringify({
        auditoriaId,
        callData
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar dados da ligação: ${response.statusText}`);
    }

    return await response.json();
  }

  private async searchAndSendRecording(callSession: CallSession): Promise<void> {
    // Aguardar 4 segundos antes de tentar buscar (tempo para Asterisk processar)
    await new Promise(resolve => setTimeout(resolve, 4000));

    try {
      // Tentar buscar gravação no Asterisk se configurado
      if (this.config.asteriskConfig && callSession.auditoriaId && callSession.callDataId) {
        console.log('Tentando buscar gravação no Asterisk...');
        const audioBlob = await this.fetchAsteriskRecording(callSession);
        
        if (audioBlob) {
          console.log('Gravação encontrada no Asterisk, enviando...');
          await this.sendAudioRecording(callSession.auditoriaId, callSession.callDataId, audioBlob);
          return;
        }
      }

      // Se não encontrou no Asterisk, verificar se há blob local
      if (callSession.recordingBlob && callSession.auditoriaId && callSession.callDataId) {
        console.log('Usando gravação local da extensão...');
        await this.sendAudioRecording(callSession.auditoriaId, callSession.callDataId, callSession.recordingBlob);
      } else {
        console.log('Nenhuma gravação encontrada - dados da ligação salvos sem áudio');
      }
    } catch (error) {
      console.error('Erro ao buscar/enviar gravação:', error);
    }
  }

  private async fetchAsteriskRecording(callSession: CallSession): Promise<Blob | null> {
    if (!this.config.asteriskConfig || !callSession.callData) {
      return null;
    }

    const { asteriskConfig } = this.config;
    const callData = callSession.callData;

    // Possíveis identificadores para buscar a gravação
    const possibleIds = [
      callData.metadata?.callerId,
      callSession.sessionId,
      `${callData.phoneNumber}_${callData.startTime}`,
      `${callData.phoneNumber}_${new Date(callData.startTime!).getTime()}`
    ].filter(Boolean);

    // Endpoints possíveis do Asterisk
    const endpoints = [
      '/ari/recordings/stored/{id}/file',
      '/ari/recordings/{id}/file',
      '/recordings/{id}.wav',
      '/recordings/{id}.mp3',
      '/monitor/{id}.wav',
      '/monitor/{id}.mp3'
    ];

    for (const id of possibleIds) {
      for (const endpoint of endpoints) {
        try {
          const url = `${asteriskConfig.url}${endpoint.replace('{id}', id as string)}`;
          console.log(`Tentando endpoint: ${url}`);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(`${asteriskConfig.username}:${asteriskConfig.password}`)}`
            },
            signal: AbortSignal.timeout(asteriskConfig.timeout || 30000)
          });

          if (response.ok && response.body) {
            console.log(`Gravação encontrada em: ${url}`);
            return await response.blob();
          }
        } catch (error) {
          console.log(`Falha no endpoint ${endpoint} com ID ${id}:`, error);
          continue;
        }
      }
    }

    // Tentar buscar por API de pesquisa se disponível
    try {
      const searchUrl = `${asteriskConfig.url}/ari/recordings?phone=${callData.phoneNumber}&start=${callData.startTime}`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${btoa(`${asteriskConfig.username}:${asteriskConfig.password}`)}`
        },
        signal: AbortSignal.timeout(asteriskConfig.timeout || 30000)
      });

      if (searchResponse.ok) {
        const recordings = await searchResponse.json();
        if (recordings.length > 0) {
          // Pegar a primeira gravação encontrada
          const recordingId = recordings[0].id || recordings[0].uniqueId;
          if (recordingId) {
            for (const endpoint of endpoints) {
              try {
                const url = `${asteriskConfig.url}${endpoint.replace('{id}', recordingId)}`;
                const response = await fetch(url, {
                  headers: {
                    'Authorization': `Basic ${btoa(`${asteriskConfig.username}:${asteriskConfig.password}`)}`
                  }
                });
                
                if (response.ok) {
                  return await response.blob();
                }
              } catch (error) {
                continue;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Falha na busca por API:', error);
    }

    return null;
  }

  private async sendAudioRecording(auditoriaId: string, callDataId: string, audioBlob: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `call_recording_${Date.now()}.wav`);
    formData.append('callDataId', callDataId);
    formData.append('idioma', 'pt');

    const response = await fetch(`${this.config.backendUrl}/auditorias/${auditoriaId}/chrome-audio`, {
      method: 'POST',
      headers: {
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar áudio da ligação: ${response.statusText}`);
    }

    console.log('Áudio da ligação enviado com sucesso');
  }

  public async setRecording(sessionId: string, recordingBlob: Blob): Promise<void> {
    const callSession = this.activeCalls.get(sessionId);
    if (callSession) {
      callSession.recordingBlob = recordingBlob;
    }
  }

  public getConfig(): AuditoriaConfig {
    return { ...this.config };
  }

  public isEnabled(): boolean {
    return this.config.enabled && !!this.config.projetoId;
  }

  public getActiveCallsCount(): number {
    return this.activeCalls.size;
  }
}

export const auditoriaService = new AuditoriaService();
export type { AuditoriaConfig, CallData };