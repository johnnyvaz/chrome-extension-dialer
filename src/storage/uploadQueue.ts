import { UploadQueueItem } from "../common/auth-types";
import { STORAGE_KEYS } from "../api/constants";

/**
 * Salva fila de upload no chrome.storage.local
 */
export async function saveUploadQueue(queue: UploadQueueItem[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LOCAL.UPLOAD_QUEUE]: queue,
  });
}

/**
 * Recupera fila de upload do chrome.storage.local
 */
export async function getUploadQueue(): Promise<UploadQueueItem[]> {
  const result = await chrome.storage.local.get(
    STORAGE_KEYS.LOCAL.UPLOAD_QUEUE
  );
  return result[STORAGE_KEYS.LOCAL.UPLOAD_QUEUE] || [];
}

/**
 * Adiciona item à fila de upload
 */
export async function enqueueUpload(item: UploadQueueItem): Promise<void> {
  const queue = await getUploadQueue();
  queue.push(item);
  await saveUploadQueue(queue);
}

/**
 * Remove item da fila de upload por ID
 */
export async function dequeueUpload(itemId: string): Promise<void> {
  const queue = await getUploadQueue();
  const filtered = queue.filter((item) => item.id !== itemId);
  await saveUploadQueue(filtered);
}

/**
 * Atualiza item na fila de upload
 */
export async function updateUploadItem(
  itemId: string,
  updates: Partial<UploadQueueItem>
): Promise<void> {
  const queue = await getUploadQueue();
  const index = queue.findIndex((item) => item.id === itemId);

  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    await saveUploadQueue(queue);
  }
}

/**
 * Obtém próximo item pendente da fila (ordenado por nextRetryAt)
 */
export async function getNextPendingUpload(): Promise<UploadQueueItem | null> {
  const queue = await getUploadQueue();
  const now = Date.now();

  // Filtra apenas pending/retrying que estão prontos para retry
  const pending = queue.filter(
    (item) =>
      (item.status === "pending" || item.status === "retrying") &&
      item.nextRetryAt <= now
  );

  if (pending.length === 0) {
    return null;
  }

  // Ordena por nextRetryAt (mais antigos primeiro)
  pending.sort((a, b) => a.nextRetryAt - b.nextRetryAt);

  return pending[0];
}

/**
 * Obtém contadores de status da fila
 */
export async function getUploadQueueStats(): Promise<{
  pending: number;
  retrying: number;
  failed: number;
  total: number;
}> {
  const queue = await getUploadQueue();

  return {
    pending: queue.filter((item) => item.status === "pending").length,
    retrying: queue.filter((item) => item.status === "retrying").length,
    failed: queue.filter((item) => item.status === "failed").length,
    total: queue.length,
  };
}

/**
 * Limpa itens completados ou muito antigos (mais de 7 dias)
 */
export async function cleanupUploadQueue(): Promise<void> {
  const queue = await getUploadQueue();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filtered = queue.filter((item) => {
    // Remove itens muito antigos (previne crescimento indefinido)
    return item.createdAt > sevenDaysAgo;
  });

  await saveUploadQueue(filtered);
}
