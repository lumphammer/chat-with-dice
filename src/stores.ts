import {
  CHAT_ID_LOCAL_STORAGE_KEY,
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
  COOKIES_REJECTED,
  DISPLAY_NAME_LOCAL_STORAGE_KEY,
} from "#/constants";
import { authClient } from "#/utils/auth-client.ts";
import { atom, type Atom, type WritableAtom } from "nanostores";
import { z } from "zod";

/**
 * Create a store which will persist to localStorage. If there is an existing
 * valid value in storage the store will be populated with it.
 *
 * This is intended to be called once per key at module level
 *
 * Setting the store's value to defaultValue will clear local storage.
 *
 * @param defaultValue The default value to use if no value is found in storage.
 *  Must be assignable to the output type of the validator, or null.
 * @param permissionStore An optional store that controls whether persistence is
 *  enabled.
 * @param key The key to use in localStorage.
 * @param validator A zod validator for the value type.
 * @returns A store that persists its value to localStorage.
 */
const createPersistentStore = <TValue, TDefault extends TValue | null>({
  defaultValue,
  consentStore = atom(true),
  key,
  validator,
}: {
  defaultValue: TDefault;
  consentStore?: Atom<boolean | null>;
  key: string;
  validator: z.ZodType<TValue, string>;
}): WritableAtom<TDefault | TValue> => {
  const valueStore = atom<TDefault | TValue>(defaultValue);
  if (typeof localStorage === "undefined") {
    return valueStore;
  }
  if (consentStore.get()) {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        valueStore.set(validator.decode(stored));
      } catch (e) {
        console.error(`Unable to parse localStorage value for ${key}`, e);
      }
    }
  }

  function isDefault(x: TValue | TDefault): x is TDefault {
    return x === defaultValue;
  }

  function setOrClearStorage(value: TValue | TDefault) {
    if (isDefault(value)) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, validator.encode(value));
    }
  }

  consentStore.subscribe((newHasConsent) => {
    if (newHasConsent) {
      setOrClearStorage(valueStore.get());
    } else {
      localStorage.removeItem(key);
    }
  });

  valueStore.subscribe((newValue) => {
    if (consentStore.get()) {
      setOrClearStorage(newValue);
    }
  });

  // listen for storage events
  window.addEventListener("storage", (event) => {
    if (event.key === key && event.newValue !== null) {
      try {
        valueStore.set(validator.decode(event.newValue));
      } catch (e) {
        console.error(`Unable to parse localStorage value for ${key}`, e);
      }
    }
  });

  return valueStore;
};

export const chatIdStore = createPersistentStore({
  defaultValue: null,
  key: CHAT_ID_LOCAL_STORAGE_KEY,
  validator: z.string(),
});

export const cookieConsentStore = createPersistentStore({
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
  consentStore: cookieConsentStore,
  validator: z.string(),
});

authClient.$store.listen("$sessionSignal", (_x) => {});
