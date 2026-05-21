import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";
import { Bookmark } from "../types";

const STORE_FILE = "bookmarks.json";
const STORE_KEY = "bookmarks";

interface BookmarkStore {
  bookmarks: Bookmark[];
  isLoaded: boolean;
  loadBookmarks: () => Promise<void>;
  addBookmark: (bookmark: Omit<Bookmark, "id">) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
}

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await load(STORE_FILE);
  }
  return storeInstance;
}

async function persist(bookmarks: Bookmark[]) {
  const store = await getStore();
  await store.set(STORE_KEY, bookmarks);
  await store.save();
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  isLoaded: false,

  loadBookmarks: async () => {
    if (get().isLoaded) return;
    try {
      const store = await getStore();
      const saved = await store.get<Bookmark[]>(STORE_KEY);
      set({ bookmarks: saved ?? [], isLoaded: true });
    } catch {
      set({ bookmarks: [], isLoaded: true });
    }
  },

  addBookmark: async (bookmarkData) => {
    const id = `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next = [...get().bookmarks, { ...bookmarkData, id }];
    set({ bookmarks: next });
    await persist(next);
  },

  removeBookmark: async (id) => {
    const next = get().bookmarks.filter((b) => b.id !== id);
    set({ bookmarks: next });
    await persist(next);
  },

  updateBookmark: async (id, updates) => {
    const next = get().bookmarks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    set({ bookmarks: next });
    await persist(next);
  },
}));
