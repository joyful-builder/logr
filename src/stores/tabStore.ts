import { create } from "zustand";
import { Tab } from "../types";

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, "id" | "highlights" | "scrollPosition" | "hasUnread">) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  getActiveTab: () => Tab | null;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tabData) => {
    const existing = get().tabs.find(
      (t) => t.filePath === tabData.filePath && t.sshConnectionId === tabData.sshConnectionId
    );
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: Tab = {
      ...tabData,
      id,
      highlights: [],
      scrollPosition: 0,
      hasUnread: false,
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));
    return id;
  },

  removeTab: (id) => {
    set((state) => {
      const filtered = state.tabs.filter((t) => t.id !== id);
      let nextActiveId = state.activeTabId;
      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex((t) => t.id === id);
        nextActiveId =
          filtered[idx]?.id ?? filtered[idx - 1]?.id ?? null;
      }
      return { tabs: filtered, activeTabId: nextActiveId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
}));
