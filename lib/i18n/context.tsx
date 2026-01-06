"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, Translations } from "./translations";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "vistral_language";

// Get initial language from localStorage or browser preference
function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "es";
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "es" || stored === "en") {
    return stored;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split("-")[0];
  return browserLang === "en" ? "en" : "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Use a mounted state to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [language, setLanguageState] = useState<Language>("es"); // Default to "es" for SSR

  // Only read from localStorage after mount
  useEffect(() => {
    setMounted(true);
    const initialLang = getInitialLanguage();
    setLanguageState(initialLang);
  }, []);

  // Sync with localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language, mounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

