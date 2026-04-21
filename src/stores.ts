import {
  CHAT_ID_LOCAL_STORAGE_KEY,
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
  COOKIES_REJECTED,
  DISPLAY_NAME_LOCAL_STORAGE_KEY,
} from "#/constants";
// import { sessionAtom } from "#/utils/auth-client.ts";
import { createPersistentStore } from "./utils/createPersistentStore";
import { z } from "zod";

export const chatIdStore = createPersistentStore({
  defaultValue: null,
  key: CHAT_ID_LOCAL_STORAGE_KEY,
  validator: z.string(),
});

export const storageConsentStore = createPersistentStore({
  defaultValue: null,
  key: COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  validator: z.codec(z.string(), z.boolean(), {
    encode: (x) => (x ? COOKIES_ACCEPTED : COOKIES_REJECTED),
    decode: (x) => x === COOKIES_ACCEPTED,
  }),
});

export const displayNameStore = createPersistentStore({
  defaultValue: null,
  key: DISPLAY_NAME_LOCAL_STORAGE_KEY,
  consentStore: storageConsentStore,
  validator: z.string(),
});
