import { CallRecording, UploadQueueItem, ApiError } from "../common/auth-types";
import { RETRY_CONFIG } from "../api/constants";
import * as uploadApi from "../api/uploadApi";
import * as uploadQueue from "../storage/uploadQueue";
import * as audioStorage from "../storage/audioStorage";

/**
 * UploadService
 * Gerencia fila de upload de gravações com retry automático
 */
class UploadService {
  private static instance: UploadService;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * Adiciona gravação à fila de upload
   * Salva áudio no IndexedDB e metadata na fila
   */
  async enqueue(recording: CallRecording): Promise<void> {
    try {
      // Salva áudio no IndexedDB
      await audioStorage.saveAudioRecording(recording);

      // Cria item da fila
      const queueItem: UploadQueueItem = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recordingId: recording.id,
        audioStorageId: recording.id,
        metadata: {
          caller: recording.caller,
          callee: recording.callee,
          startedAt: recording.startedAt,
          durationSeconds: recording.durationSeconds,
          projectId: recording.projectId,
          insightId: recording.insightId,
        },
        retryCount: 0,
        nextRetryAt: Date.now(), // Tenta imediatamente
        status: "pending",
        createdAt: Date.now(),
      };

      await uploadQueue.enqueueUpload(queueItem);

      console.log("Gravação adicionada à fila de upload:", queueItem.id);

      // Tenta processar imediatamente
      this.processQueue();
    } catch (error) {
      console.error("Erro ao adicionar gravação à fila:", error);
      throw error;
    }
  }

  /**
   * Processa próximo item da fila
   * Chama upload() e atualiza status/retry
   */
  async processNext(): Promise<boolean> {
    if (this.isProcessing) {
      return false;
    }

    const nextItem = await uploadQueue.getNextPendingUpload();
    if (!nextItem) {
      return false;
    }

    this.isProcessing = true;

    try {
      console.log(
        `Processando upload: ${nextItem.id} (tentativa ${
          nextItem.retryCount + 1
        }/${RETRY_CONFIG.MAX_ATTEMPTS})`
      );

      // Atualiza status para retrying
      await uploadQueue.updateUploadItem(nextItem.id, {
        status: "retrying",
        lastAttemptAt: Date.now(),
      });

      // Tenta fazer upload
      await this.upload(nextItem);

      // Sucesso - remove da fila
      await uploadQueue.dequeueUpload(nextItem.id);
      console.log(`Upload concluído com sucesso: ${nextItem.id}`);

      // Remove áudio do IndexedDB após upload bem-sucedido
      await audioStorage.deleteAudioRecording(nextItem.audioStorageId);

      return true;
    } catch (error) {
      console.error(`Erro no upload ${nextItem.id}:`, error);

      const newRetryCount = nextItem.retryCount + 1;

      // Verifica se atingiu limite de tentativas
      if (newRetryCount >= RETRY_CONFIG.MAX_ATTEMPTS) {
        // Marca como failed
        await uploadQueue.updateUploadItem(nextItem.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Erro desconhecido",
          retryCount: newRetryCount,
        });
        console.error(
          `Upload falhou após ${RETRY_CONFIG.MAX_ATTEMPTS} tentativas: ${nextItem.id}`
        );
      } else {
        // Agenda próximo retry com exponential backoff
        const backoffDelay = Math.min(
          RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, newRetryCount),
          RETRY_CONFIG.MAX_DELAY_MS
        );
        const nextRetryAt = Date.now() + backoffDelay;

        await uploadQueue.updateUploadItem(nextItem.id, {
          status: "pending",
          retryCount: newRetryCount,
          nextRetryAt,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });

        console.log(
          `Upload será retentado em ${backoffDelay}ms: ${nextItem.id}`
        );
      }

      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Faz upload de um item da fila
   * Carrega áudio do IndexedDB e envia para API
   */
  private async upload(item: UploadQueueItem): Promise<void> {
    // Carrega áudio do IndexedDB
    const recording = await audioStorage.getAudioRecording(item.audioStorageId);
    if (!recording) {
      throw new Error("Gravação não encontrada no storage");
    }

    // Chama API de upload
    await uploadApi.uploadCall({
      audio: recording.audioBlob,
      metadata: item.metadata,
    });
  }

  /**
   * Processa toda a fila (até esvaziar ou falhar)
   * Usado pelo background worker
   */
  async processQueue(): Promise<void> {
    let processed = true;
    let count = 0;

    while (processed && count < 10) {
      // Limite de segurança
      processed = await this.processNext();
      if (processed) {
        count++;
      }
    }

    if (count > 0) {
      console.log(`Processados ${count} uploads`);
    }

    // Cleanup de itens antigos
    await uploadQueue.cleanupUploadQueue();
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats() {
    return await uploadQueue.getUploadQueueStats();
  }

  /**
   * Força retry de todos os itens failed
   */
  async retryFailed(): Promise<void> {
    const queue = await uploadQueue.getUploadQueue();
    const failed = queue.filter((item) => item.status === "failed");

    for (const item of failed) {
      await uploadQueue.updateUploadItem(item.id, {
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        error: undefined,
      });
    }

    console.log(`${failed.length} uploads marcados para retry`);

    // Processa fila
    this.processQueue();
  }
}

export const uploadService = UploadService.getInstance();
