/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bn from '../i18n/bn.json';
import en from '../i18n/en.json';

const STRINGS = { bn, en };
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // index.html already picked the saved or browser language before React loaded.
  const [lang, setLang] = useState(() => (document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'bn'));

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    try {
      localStorage.setItem('bdmap-lang', lang);
    } catch {
      /* storage blocked — keep working without it */
    }
  }, [lang]);

  // Bangla digits when Bangla is active (e.g. seat ১, not 1).
  const num = useCallback(
    (n) => (lang === 'bn' ? String(n).replace(/\d/g, (d) => BN_DIGITS[d]) : String(n)),
    [lang],
  );
  const t = useCallback(
    (key, vars) => {
      let s = STRINGS[lang][key] ?? key;
      if (vars) for (const k in vars) s = s.replace(`{${k}}`, num(vars[k]));
      return s;
    },
    [lang, num],
  );
  // A place's name in the active language, and in the other one.
  const name = useCallback((p) => (lang === 'bn' ? p.name_bn : p.name_en), [lang]);
  const altName = useCallback((p) => (lang === 'bn' ? p.name_en : p.name_bn), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, num, name, altName }), [lang, t, num, name, altName]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
