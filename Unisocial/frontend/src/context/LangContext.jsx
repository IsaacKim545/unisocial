import { createContext, useContext, useState, useCallback } from "react";
import { t as translate } from "../i18n";
import api from "../api/client";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("sh_lang") || "ko");

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem("sh_lang", l);
    api.setLang(l);
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be inside LangProvider");
  return ctx;
}
