export const CHAT_ID_LOCAL_STORAGE_KEY = "chatId";
export const DISPLAY_NAME_LOCAL_STORAGE_KEY = "displayName";
export const GENERIC_ROOM_TYPE = "generic";
export const HAVOC_ROOM_TYPE = "havoc";

// this is the golden source of truth about what room types exist
export const ROOM_TYPES = [GENERIC_ROOM_TYPE, HAVOC_ROOM_TYPE] as const;

export const STANDARD_ROLL_TYPE = "standard";
export const F20_ROLL_TYPE = "f20";
export const FORMULA_ROLL_TYPE = "formula";
export const HAVOC_ROLL_TYPE = "havoc";
export const FITD_ROLL_TYPE = "fitd";

export const ROLL_TYPES = [
  STANDARD_ROLL_TYPE,
  F20_ROLL_TYPE,
  FORMULA_ROLL_TYPE,
  HAVOC_ROLL_TYPE,
  FITD_ROLL_TYPE,
] as const;

export const FITD_FAILURE_DEGREE = 0;
export const FITD_PARTIAL_DEGREE = 1;
export const FITD_SUCCESS_DEGREE = 2;
export const FITD_CRITICAL_DEGREE = 3;

export const HAVOC_FAILURE_DEGREE = 0;
export const HAVOC_SUCCESS_DEGREE = 1;
export const HAVOC_CRITICAL_DEGREE = 2;
