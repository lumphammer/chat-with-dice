import {
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
  COOKIES_REJECTED,
} from "#/constants";
// import { sessionAtom } from "#/utils/auth-client.ts";
import { createPersistentStore } from "./utils/createPersistentStore";
import { z } from "zod";

export const storageConsentStore = createPersistentStore({
  defaultValue: null,
  key: COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  validator: z.codec(z.string(), z.boolean(), {
    encode: (x) => (x ? COOKIES_ACCEPTED : COOKIES_REJECTED),
    decode: (x) => x === COOKIES_ACCEPTED,
  }),
});
