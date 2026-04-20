// oxlint-disable typescript/unbound-method
import { useCallback, useSyncExternalStore } from "react";
import type { z } from "zod";

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
 * Wrap a store in a persistence layer. If there is an existing valid value in
 * storage the store will be populated with it.
 * @param valueStore The store to persist
 * @param permissionStore An optional store that controls whether persistence is enabled
 * @param key The key to use in localStorage
 */
export const createPersistentStore = <T>({
  defaultValue,
  permissionStore,
  key,
  validator,
}: {
  defaultValue: T;
  permissionStore?: Store<boolean>;
  key: string;
  validator: z.ZodType<T>;
}): [Store<T>, () => void] => {
  const valueStore = createStore(defaultValue);
  if (typeof localStorage === "undefined") {
    return [valueStore, () => {}];
  }
  if (permissionStore?.getValue() ?? true) {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        valueStore.setValue(validator.parse(JSON.parse(stored)));
      } catch (e) {
        console.error(`Unable to parse localStorage value for ${key}`, e);
      }
    }
  }

  const tearDownPermissionsListener =
    permissionStore &&
    permissionStore.subscribe((newHasPermission) => {
      if (newHasPermission) {
        localStorage.setItem(key, JSON.stringify(valueStore.getValue()));
      } else {
        localStorage.removeItem(key);
      }
    });

  const tearDownValueListener = valueStore.subscribe((newValue) => {
    if (permissionStore?.getValue() ?? true) {
      localStorage.setItem(key, JSON.stringify(newValue));
    }
  });

  // listen for storage events
  window.addEventListener("storage", (event) => {
    if (event.key === key && event.newValue !== null) {
      try {
        valueStore.setValue(validator.parse(JSON.parse(event.newValue)));
      } catch (e) {
        console.error(`Unable to parse localStorage value for ${key}`, e);
      }
    }
  });

  const teardown = () => {
    tearDownValueListener();
    tearDownPermissionsListener?.();
  };
  return [valueStore, teardown];
};
