export const CHAT_ID_LOCAL_STORAGE_KEY = "chatId";
export const DISPLAY_NAME_LOCAL_STORAGE_KEY = "displayName";
export const GENERIC_ROOM_TYPE = "generic";
export const HAVOC_ROOM_TYPE = "havoc";

// this is the golden source of truth about what room types exist
export const ROOM_TYPES = [GENERIC_ROOM_TYPE, HAVOC_ROOM_TYPE] as const;

export const SIX = 6;

export const FITD_FAILURE_DEGREE = 0;
export const FITD_PARTIAL_DEGREE = 1;
export const FITD_SUCCESS_DEGREE = 2;
export const FITD_CRITICAL_DEGREE = 3;

export const HAVOC_FAILURE_DEGREE = "failure";
export const HAVOC_SUCCESS_DEGREE = "success";
export const HAVOC_CRITICAL_DEGREE = "critical";
export const HAVOC_SUCCESS_MIN = 4;
export const HAVOC_CRITICAL_MIN = 6;
