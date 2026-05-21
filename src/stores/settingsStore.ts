import { create } from "zustand";
import type { Language } from "../i18n/translations";

interface SettingsStore {
  theme: "dark";
  defaultEncoding: string;
  defaultTailLines: number;
  language: Language;
  setDefaultEncoding: (encoding: string) => void;
  setDefaultTailLines: (lines: number) => void;
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: "dark",
  defaultEncoding: "UTF-8",
  defaultTailLines: 1000,
  language: "ko",
  setDefaultEncoding: (encoding) => set({ defaultEncoding: encoding }),
  setDefaultTailLines: (lines) => set({ defaultTailLines: lines }),
  setLanguage: (language) => set({ language }),
}));
