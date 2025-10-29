import {
  Application,
  ConferenceParticipantAction,
  ConferenceParticipantActions,
  FetchError,
  FetchTransport,
  Queue,
  RegisteredUser,
  StatusCodes,
  UpdateCall,
} from "./types";
import { MSG_SOMETHING_WRONG } from "./constants";
import { getActiveSettings } from "src/storage";
import { EmptyData } from "src/common/types";

const fetchTransport = <Type>(
  url: string,
  options: RequestInit
): Promise<FetchTransport<Type>> => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url, options);
      const transport: FetchTransport<Type> = {
        headers: response.headers,
        status: response.status,
        json: <Type>{},
      };

      // Redirect unauthorized
      if (response.status === StatusCodes.UNAUTHORIZED) {
        reject();
      }

      // API error handling returns { msg: string; }
      // See @type StatusJSON and StatusEmpty in ./types
      if (
        response.status >= StatusCodes.BAD_REQUEST &&
        response.status <= StatusCodes.INTERNAL_SERVER_ERROR
      ) {
        try {
          const errJson = await response.json();
          reject(<FetchError>{
            status: response.status,
            ...errJson,
          });
        } catch (error) {
          reject(<FetchError>{
            status: response.status,
            msg: MSG_SOMETHING_WRONG,
          });
        }
      }

      // API success handling returns a valid JSON response
      // This could either be a DTO object or a generic response
      // See types for various responses in ./types
      if (
        response.status === StatusCodes.OK ||
        response.status === StatusCodes.CREATED
      ) {
        // Handle blobs -- e.g. pcap file API for RecentCalls
        if (
          options.headers!["Content-Type" as keyof HeadersInit] ===
          "application/octet-stream"
        ) {
          const blob: Blob = await response.blob();

          transport.blob = blob;
        } else {
          const json: Type = await response.json();

          transport.json = json;
        }
      }

      resolve(transport);
      // TypeError "Failed to fetch"
      // net::ERR_CONNECTION_REFUSED
      // This is the case if the server is unreachable...
    } catch (error: unknown) {
      reject(<FetchError>{
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        msg: (error as TypeError).message,
      });
    }
  });
};

const getAuthHeaders = () => {
  const advancedSettings = getActiveSettings();
  let token = advancedSettings?.decoded?.apiKey ?? null;

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Get authentication headers for Supabase API
 * Used for new authentication endpoints
 */
export const getSupabaseAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const result = await chrome.storage.session.get('auth_token');
    const token = result.auth_token;

    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  } catch (error) {
    return {
      "Content-Type": "application/json",
    };
  }
};

/**
 * Enhanced fetch transport with retry logic and better error handling
 * for new authentication system
 */
export const authFetchTransport = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  try {
    const response = await fetch(url, options);

    // Handle 401 Unauthorized - trigger silent logout
    if (response.status === 401) {
      // Clear auth storage
      await chrome.storage.session.remove(['auth_token', 'user_id', 'company_context']);
      throw new Error('unauthorized');
    }

    // Handle other error statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'unknown_error',
        message: 'An error occurred'
      }));

      const error: any = new Error(errorData.message || 'Request failed');
      error.status = response.status;
      error.code = errorData.error;
      error.details = errorData.details;
      throw error;
    }

    // Success - parse JSON response
    return await response.json();
  } catch (error: any) {
    // Network errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const netError: any = new Error('Erro de conexão. Verifique sua internet.');
      netError.isNetworkError = true;
      throw netError;
    }

    throw error;
  }
};

export const getFetch = <Type>(url: string) => {
  return fetchTransport<Type>(url, {
    headers: getAuthHeaders(),
  });
};

export const postFetch = <Type, Payload = undefined>(
  url: string,
  payload?: Payload
) => {
  return fetchTransport<Type>(url, {
    method: "POST",
    ...(payload && { body: JSON.stringify(payload) }),
    headers: getAuthHeaders(),
  });
};

export const putFetch = <Type, Payload>(url: string, payload: Payload) => {
  return fetchTransport<Type>(url, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: getAuthHeaders(),
  });
};

export const deleteFetch = <Type>(url: string) => {
  return fetchTransport<Type>(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
};

// GET Devices Users
export const getRegisteredUser = () => {
  const advancedSettings = getActiveSettings();
  return getFetch<string[]>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/RegisteredSipUsers`
  );
};

export const getApplications = () => {
  const advancedSettings = getActiveSettings();
  return getFetch<Application[]>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/Applications`
  );
};

// validate user advanced credential
export const getAdvancedValidation = (
  apiServer: string,
  accountSid: string
) => {
  return getFetch<Application[]>(
    `${apiServer}/Accounts/${accountSid}/Applications`
  );
};

export const getQueues = () => {
  const advancedSettings = getActiveSettings();
  return getFetch<Queue[]>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/Queues`
  );
};

export const getSelfRegisteredUser = (username: string) => {
  const advancedSettings = getActiveSettings();
  return getFetch<RegisteredUser>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/RegisteredSipUsers/${username}`
  );
};

export const getConferences = () => {
  const advancedSettings = getActiveSettings();
  return getFetch<string[]>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/Conferences`
  );
};

export const updateConferenceParticipantAction = (
  callSid: string,
  payload: ConferenceParticipantAction
) => {
  const advancedSettings = getActiveSettings();
  return putFetch<EmptyData, UpdateCall>(
    `${advancedSettings?.decoded?.apiServer}/Accounts/${advancedSettings?.decoded?.accountSid}/Calls/${callSid}`,
    {
      conferenceParticipantAction: payload,
    }
  );
};
