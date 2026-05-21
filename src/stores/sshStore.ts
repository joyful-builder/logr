import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";
import { SshConnection } from "../types";

const STORE_FILE = "ssh_connections.json";
const STORE_KEY = "connections";

interface SshStore {
  connections: SshConnection[];
  isLoaded: boolean;
  connectedIds: Set<string>;
  loadConnections: () => Promise<void>;
  addConnection: (conn: Omit<SshConnection, "id">) => Promise<SshConnection>;
  updateConnection: (id: string, updates: Partial<SshConnection>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  setConnected: (id: string, connected: boolean) => void;
}

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await load(STORE_FILE);
  }
  return storeInstance;
}

async function persist(connections: SshConnection[]) {
  const store = await getStore();
  await store.set(STORE_KEY, connections);
  await store.save();
}

export const useSshStore = create<SshStore>((set, get) => ({
  connections: [],
  isLoaded: false,
  connectedIds: new Set(),

  loadConnections: async () => {
    if (get().isLoaded) return;
    try {
      const store = await getStore();
      const saved = await store.get<SshConnection[]>(STORE_KEY);
      set({ connections: saved ?? [], isLoaded: true });
    } catch {
      set({ connections: [], isLoaded: true });
    }
  },

  addConnection: async (connData) => {
    const id = `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const conn: SshConnection = { ...connData, id };
    const next = [...get().connections, conn];
    set({ connections: next });
    await persist(next);
    return conn;
  },

  updateConnection: async (id, updates) => {
    const next = get().connections.map((c) => (c.id === id ? { ...c, ...updates } : c));
    set({ connections: next });
    await persist(next);
  },

  removeConnection: async (id) => {
    const next = get().connections.filter((c) => c.id !== id);
    set({ connections: next });
    await persist(next);
  },

  setConnected: (id, connected) => {
    set((state) => {
      const next = new Set(state.connectedIds);
      if (connected) next.add(id);
      else next.delete(id);
      return { connectedIds: next };
    });
  },
}));
