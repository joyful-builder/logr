import { translations, Language, TranslationKey } from "./translations";
import { useSettingsStore } from "../stores/settingsStore";

export function useT() {
  const language = useSettingsStore((s) => s.language);
  return (key: TranslationKey): string => translations[language][key];
}

export type { Language, TranslationKey };
