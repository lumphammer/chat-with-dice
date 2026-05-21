import { atom, type Atom, type WritableAtom } from "nanostores";
import * as z from "zod";

/**
 * Create a store which will persist to localStorage. If there is an existing
 * valid value in storage the store will be populated with it.
 *
 * This is intended to be called once per key at module level. Creating >1 store
 * for the same storage key will cause you problems, because they won't see
 * each other's updates.
 *
 * Setting the store's value to defaultValue will clear local storage.
 *
 * @param defaultValue The default value to use if no value is found in storage.
 *  Must be assignable to the output type of the validator, or null.
 * @param consentStore An optional store that controls whether persistence is
 *  enabled (defaults to always true.)
 * @param key The key to use in localStorage.
 * @param validator A zod validator for the value type. Respects zod
 * encode/decode semantics: the "encoded" value is what's persisted (and must be
 * a string); the "decoded" value is what you get in-app.
 * @returns A nanostore atom that persists its value to localStorage.
 */
export const createPersistentStore = <TValue, TDefault extends TValue | null>({
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

  // Sets the local storage value, or clears it if the new value is the default
  // value (because the default value will be returned anyway in that case.)
  function setOrClearStorage(value: TValue | TDefault) {
    if (isDefault(value)) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, validator.encode(value));
    }
  }

  // If the consent store changes to true, we write through to storage. If it
  // changes to false, clear storage (but stay in memory.)
  consentStore.subscribe((newHasConsent) => {
    if (newHasConsent) {
      setOrClearStorage(valueStore.get());
    } else {
      localStorage.removeItem(key);
    }
  });

  // If the value store changes, and we have consent, write through to storage.
  valueStore.subscribe((newValue) => {
    if (consentStore.get()) {
      setOrClearStorage(newValue);
    }
  });

  // listen for storage events from other windows. storage events *don't* get
  // fired in the window that caused them - I guess to prevent loops?
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
