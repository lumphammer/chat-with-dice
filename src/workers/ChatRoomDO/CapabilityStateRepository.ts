const getStorageKey = (name: string) => `capabilities.${name}.state`;

export class CapabilityStateRepository {
  constructor(private kv: SyncKvStorage) {}

  set(name: string, state: unknown): void {
    this.kv.put(getStorageKey(name), state);
  }

  get(name: string): unknown {
    return this.kv.get(getStorageKey(name));
  }
}
