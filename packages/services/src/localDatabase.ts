import { DatabaseHealth } from "./interfaces";

interface PersistedEvent {
  stream: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface MinimalStorage {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalKeyValueDatabase {
  health(): Promise<DatabaseHealth>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  appendEvent(stream: string, event: Record<string, unknown>): Promise<void>;
  listEvents(stream: string, limit?: number): Promise<Record<string, unknown>[]>;
}

const namespace = "chessalive:v1";
const memoryStore = new Map<string, string>();

interface RemoteDatabaseOptions {
  remoteEndpoint?: string;
}

function storage() {
  return (globalThis as { localStorage?: MinimalStorage }).localStorage;
}

function canUseLocalStorage() {
  return typeof globalThis !== "undefined" && Boolean(storage());
}

function readRaw(key: string) {
  const storageKey = `${namespace}:${key}`;
  if (canUseLocalStorage()) {
    try {
      return storage()?.getItem(storageKey) ?? null;
    } catch {
      return memoryStore.get(storageKey) ?? null;
    }
  }
  return memoryStore.get(storageKey) ?? null;
}

function writeRaw(key: string, value: string) {
  const storageKey = `${namespace}:${key}`;
  if (canUseLocalStorage()) {
    try {
      storage()?.setItem(storageKey, value);
      return;
    } catch {
      memoryStore.set(storageKey, value);
      return;
    }
  }
  memoryStore.set(storageKey, value);
}

function keysWithPrefix(prefix: string) {
  const storagePrefix = `${namespace}:${prefix}`;
  if (canUseLocalStorage()) {
    try {
      const local = storage();
      if (!local) return [];
      return Array.from({ length: local.length })
        .map((_, index) => local.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(storagePrefix)));
    } catch {
      return [...memoryStore.keys()].filter((key) => key.startsWith(storagePrefix));
    }
  }
  return [...memoryStore.keys()].filter((key) => key.startsWith(storagePrefix));
}

function remoteEndpoint(options?: RemoteDatabaseOptions) {
  return options?.remoteEndpoint?.replace(/\/$/, "");
}

async function fetchRemote<T>(options: RemoteDatabaseOptions | undefined, path: string, init?: RequestInit): Promise<T | null> {
  const endpoint = remoteEndpoint(options);
  if (!endpoint || typeof fetch === "undefined") return null;
  try {
    const response = await fetch(`${endpoint}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function createLocalDatabase(options?: RemoteDatabaseOptions): LocalKeyValueDatabase {
  return {
    health: async () => {
      const remote = await fetchRemote<DatabaseHealth>(options, "/database/health");
      if (remote) return remote;
      return {
        driver: canUseLocalStorage() ? "browser-local" : "memory",
        hotStore: "in-memory room state",
        durableStore: canUseLocalStorage() ? "browser localStorage event log" : "process memory fallback",
        estimatedMonthlyCostUsd: 0,
        latencyBudgetMs: 25,
        records: keysWithPrefix("").length,
      };
    },
    get: async <T>(key: string) => {
      const remote = await fetchRemote<{ value: T | null }>(options, `/database/kv?key=${encodeURIComponent(key)}`);
      if (remote && "value" in remote) return remote.value;
      const raw = readRaw(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set: async <T>(key: string, value: T) => {
      writeRaw(key, JSON.stringify(value));
      void fetchRemote(options, "/database/kv", {
        method: "POST",
        body: JSON.stringify({ key, value }),
      });
    },
    appendEvent: async (stream, event) => {
      const key = `events:${stream}`;
      const events = JSON.parse(readRaw(key) ?? "[]") as PersistedEvent[];
      events.push({ stream, createdAt: new Date().toISOString(), payload: event });
      writeRaw(key, JSON.stringify(events.slice(-500)));
      void fetchRemote(options, "/database/events", {
        method: "POST",
        body: JSON.stringify({ event, stream }),
      });
    },
    listEvents: async (stream, limit = 50) => {
      const remote = await fetchRemote<{ events: Record<string, unknown>[] }>(
        options,
        `/database/events?stream=${encodeURIComponent(stream)}&limit=${encodeURIComponent(String(limit))}`,
      );
      if (remote?.events) return remote.events;
      const events = JSON.parse(readRaw(`events:${stream}`) ?? "[]") as PersistedEvent[];
      return events.slice(-limit).map((event) => ({ createdAt: event.createdAt, ...event.payload }));
    },
  };
}
