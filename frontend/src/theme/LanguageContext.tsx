import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { t as translate, type TKey } from './translations';

type Lang = 'fr' | 'en';
const STORAGE_KEY = 'pguard-lang';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx | null>(null);

// Persisted UI language. Default French. (Toggle only for now — strings are not
// yet fully translated; this is the working switch + storage the t() layer will
// read from later.)
function initialLang(): Lang {
  return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): (key: TKey, vars?: Record<string, string | number>) => string {
  const { lang } = useLang();
  return (key, vars) => translate(lang, key, vars);
}
