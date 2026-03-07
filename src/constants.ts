export const CHAT_ID_LOCAL_STORAGE_KEY = "chatId";
export const DISPLAY_NAME_LOCAL_STORAGE_KEY = "displayName";
export const GENERIC_ROOM_TYPE = "generic";
export const HAVOC_ROOM_TYPE = "havoc";

// this is the golden source of truth about what room types exist
export const ROOM_TYPES = [GENERIC_ROOM_TYPE, HAVOC_ROOM_TYPE] as const;
