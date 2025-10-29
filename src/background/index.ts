chrome.action.onClicked.addListener(async (tab) => {
  const windowId = await getWindowKey();
  if (windowId) {
    if (windowId) {
      chrome.windows.update(windowId, { focused: true }, (w) => {
        if (!w) {
          initiateNewPhonePopup();
        }
      });
    } else {
      initiateNewPhonePopup();
    }
  } else {
    initiateNewPhonePopup();
  }
});

const initiateNewPhonePopup = () => {
  chrome.windows.create(
    {
      url: chrome.runtime.getURL("window/index.html"),
      width: 440,
      height: 750,
      focused: true,
      type: "panel",
      state: "normal",
    },
    function (window) {
      if (window?.id) {
        saveWindowKey(window?.id);
      }
    }
  );
};

const saveWindowKey = async (id: number) => {
  await chrome.storage.local.set({
    WindowKey: id,
  });
};

const getWindowKey = async (): Promise<number> => {
  const result = await chrome.storage.local.get(["WindowKey"]);
  return result.WindowKey as number;
};

/**
 * Upload queue processing
 */
const UPLOAD_QUEUE_ALARM = "PROCESS_UPLOAD_QUEUE";
const UPLOAD_QUEUE_INTERVAL_MINUTES = 0.5; // 30 segundos

async function processUploadQueue() {
  try {
    // Importação dinâmica para evitar problemas de build
    const { uploadService } = await import("../services/uploadService");
    await uploadService.processQueue();
  } catch (error) {
    console.error("Erro ao processar fila de upload:", error);
  }
}

// Inicializa sistema de upload apenas se chrome.alarms está disponível
if (typeof chrome !== "undefined" && chrome.alarms) {
  // Cria alarm para processar fila de upload periodicamente
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(UPLOAD_QUEUE_ALARM, {
      periodInMinutes: UPLOAD_QUEUE_INTERVAL_MINUTES,
    });
    console.log("Upload queue alarm criado");
  });

  // Listener para alarm de processamento de fila
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === UPLOAD_QUEUE_ALARM) {
      console.log("Processando fila de upload (alarm)");
      processUploadQueue();
    }
  });
}

// Listener para mensagens de processamento de fila (sempre disponível)
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_UPLOAD_QUEUE") {
      console.log("Processando fila de upload (message)");
      processUploadQueue()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error("Erro ao processar fila:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indica resposta assíncrona
    }
  });
}

export {};
