// oxlint-disable typescript/unbound-method
import {
  CHAT_ID_LOCAL_STORAGE_KEY,
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
  COOKIES_REJECTED,
  DISPLAY_NAME_LOCAL_STORAGE_KEY,
} from "#/constants";
import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * A function that listens for changes to a store
 */
export type Listener<T> = (t: T) => void;

/**
 * A store that holds a value and notifies listeners when it changes
 */
export type Store<T> = {
  subscribe(listener: Listener<T>): () => void;
  setValue(newValue: T): void;
  getValue(): T;
};

/**
 * Create a store with the given initial value
 * @param initialValue The initial value of the store
 */
export const createStore = <T>(initialValue: T): Store<T> => {
  const listeners: Set<Listener<T>> = new Set();
  let value = initialValue;

  return {
    subscribe: (listener: Listener<T>) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setValue: (newValue: T) => {
      if (Object.is(value, newValue)) return;
      value = newValue;
      listeners.forEach((listener) => listener(newValue));
    },
    getValue: () => {
      return value;
    },
  };
};

/**
 * A hook that wraps a store and provides a reactive value and setter
 * @param store The store to wrap
 */
export const useStore = <T>(store: Store<T>) => {
  return [
    useSyncExternalStore(
      store.subscribe,
      store.getValue,
      store.getValue, // SSR
    ),
    useCallback((v: T) => store.setValue(v), [store]),
  ] as const;
};

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
export const createPersistentStore = <TValue, TDefault extends TValue | null>({
  defaultValue,
  consentStore = createStore(true),
  key,
  validator,
}: {
  defaultValue: TDefault;
  consentStore?: Store<boolean | null>;
  key: string;
  validator: z.ZodType<TValue, string>;
}): Store<TDefault | TValue> => {
  const valueStore = createStore<TDefault | TValue>(defaultValue);
  if (typeof localStorage === "undefined") {
    return valueStore;
  }
  if (consentStore.getValue()) {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        valueStore.setValue(validator.decode(stored));
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
      setOrClearStorage(valueStore.getValue());
    } else {
      localStorage.removeItem(key);
    }
  });

  valueStore.subscribe((newValue) => {
    if (consentStore.getValue()) {
      setOrClearStorage(newValue);
    }
  });

  // listen for storage events
  window.addEventListener("storage", (event) => {
    if (event.key === key && event.newValue !== null) {
      try {
        valueStore.setValue(validator.decode(event.newValue));
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
