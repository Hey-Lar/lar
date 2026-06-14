/**
 * @lar/store — storage adapters.
 *
 * The store is persistence-agnostic: it only needs a tiny key→string interface.
 * Methods may be sync or async, so the same store works over synchronous
 * localStorage today and an async IndexedDB / SQLite / file backend tomorrow.
 *
 * Adapters only ever see CIPHERTEXT — the store seals every value before it
 * reaches here. A leaked adapter dump reveals nothing.
 */

export type Awaitable<T> = T | Promise<T>;

export interface StorageAdapter {
  get(key: string): Awaitable<string | null>;
  set(key: string, value: string): Awaitable<void>;
  remove(key: string): Awaitable<void>;
  /** All keys currently held — used to enumerate a collection by prefix. */
  keys(): Awaitable<string[]>;
}

/** In-memory adapter — for tests and SSR (no persistence). */
export function memoryAdapter(seed?: Record<string, string>): StorageAdapter {
  const m = new Map<string, string>(seed ? Object.entries(seed) : []);
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
    remove: (k) => {
      m.delete(k);
    },
    keys: () => [...m.keys()],
  };
}

/** The subset of the Web Storage API (localStorage / sessionStorage) we use. */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/** Adapter backed by a Web Storage instance — pass `localStorage` in the browser. */
export function webStorageAdapter(storage: WebStorageLike): StorageAdapter {
  return {
    get: (k) => storage.getItem(k),
    set: (k, v) => {
      storage.setItem(k, v);
    },
    remove: (k) => {
      storage.removeItem(k);
    },
    keys: () => {
      const out: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k !== null) out.push(k);
      }
      return out;
    },
  };
}
