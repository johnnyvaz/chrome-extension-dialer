import { CallRecording } from '../common/auth-types';
const DB_NAME = 'scany-softphone';
const DB_VERSION = 1;
const STORE_NAMES = {
  AUDIOS: 'audios',
  METADATA: 'metadata',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Falha ao abrir banco de dados'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    // Chamado quando DB é criado pela primeira vez ou versão muda
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store para áudios se não existir
      if (!db.objectStoreNames.contains(STORE_NAMES.AUDIOS)) {
        const audioStore = db.createObjectStore(STORE_NAMES.AUDIOS, {
          keyPath: 'id',
        });

        // Índice por data de criação (para ordenar por recência)
        audioStore.createIndex('createdAt', 'createdAt', { unique: false });

        // Índice por status de upload (para filtrar pending/failed)
        audioStore.createIndex('uploadStatus', 'uploadStatus', { unique: false });
      }
    };
  });
}

export async function saveAudioRecording(recording: CallRecording): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    // Transaction com modo readwrite
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    // put() faz upsert (insert ou update se chave existe)
    const request = store.put({
      id: recording.id,
      caller: recording.caller,
      callee: recording.callee,
      startedAt: recording.startedAt,
      durationSeconds: recording.durationSeconds,
      audioBlob: recording.audioBlob,
      audioSizeBytes: recording.audioSizeBytes,
      projectId: recording.projectId,
      insightId: recording.insightId,
      uploadStatus: recording.uploadStatus,
      createdAt: recording.createdAt,
    });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Falha ao salvar gravação'));
    };
  });
}

export async function getAudioRecording(id: string): Promise<CallRecording | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result || null);
    };

    request.onerror = () => {
      reject(new Error('Falha ao recuperar gravação'));
    };
  });
}

export async function getAllAudioRecordings(): Promise<CallRecording[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Falha ao recuperar gravações'));
    };
  });
}

export async function getAudioRecordingsByStatus(
  status: CallRecording['uploadStatus']
): Promise<CallRecording[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);
    const index = store.index('uploadStatus');

    const request = index.getAll(status);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Falha ao recuperar gravações por status'));
    };
  });
}

export async function updateRecordingStatus(
  id: string,
  status: CallRecording['uploadStatus']
): Promise<void> {
  const recording = await getAudioRecording(id);

  if (!recording) {
    throw new Error(`Gravação ${id} não encontrada`);
  }

  recording.uploadStatus = status;
  await saveAudioRecording(recording);
}

export async function deleteAudioRecording(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Falha ao deletar gravação'));
    };
  });
}

export async function deleteCompletedRecordings(): Promise<number> {
  const completed = await getAudioRecordingsByStatus('completed');

  for (const recording of completed) {
    await deleteAudioRecording(recording.id);
  }

  return completed.length;
}

export async function clearAllAudioRecordings(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Falha ao limpar gravações'));
    };
  });
}

export async function getAudioRecordingsCount(): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.AUDIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.AUDIOS);

    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Falha ao contar gravações'));
    };
  });
}


export async function getTotalAudioSize(): Promise<number> {
  const recordings = await getAllAudioRecordings();

  return recordings.reduce((total, recording) => {
    return total + (recording.audioSizeBytes || 0);
  }, 0);
}

/**
 * Estatísticas de storage
 */
export interface AudioStorageStats {
  totalRecordings: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  byStatus: {
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
    retrying: number;
  };
}

/**
 * Recupera estatísticas completas de storage
 */
export async function getAudioStorageStats(): Promise<AudioStorageStats> {
  const [totalRecordings, totalSizeBytes, recordings] = await Promise.all([
    getAudioRecordingsCount(),
    getTotalAudioSize(),
    getAllAudioRecordings(),
  ]);

  const byStatus = {
    pending: 0,
    uploading: 0,
    completed: 0,
    failed: 0,
    retrying: 0,
  };

  for (const recording of recordings) {
    byStatus[recording.uploadStatus]++;
  }

  return {
    totalRecordings,
    totalSizeBytes,
    totalSizeMB: Math.round((totalSizeBytes / 1024 / 1024) * 100) / 100,
    byStatus,
  };
}

export async function initializeAudioStorage(): Promise<void> {
  try {
    await openDatabase();
    console.log('[AudioStorage] IndexedDB inicializado com sucesso');
  } catch (error) {
    console.error('[AudioStorage] Falha ao inicializar IndexedDB:', error);
    throw error;
  }
}
