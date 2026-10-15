/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useLanguage } from '../context/LanguageContext.jsx';
import bdFlag from '../assets/flags/bd.svg';
import usFlag from '../assets/flags/us.svg';

// SVG flags, not emoji: Windows shows flag emoji as plain letters.
const OPTIONS = [
  { lang: 'bn', label: 'বাংলা', flag: bdFlag },
  { lang: 'en', label: 'English', flag: usFlag },
];

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="lang" role="group" aria-label={t('language')}>
      {OPTIONS.map((o) => (
        <button key={o.lang} type="button" aria-pressed={lang === o.lang} title={o.label} onClick={() => setLang(o.lang)}>
          <img className="flag" src={o.flag} alt="" width="22" height="13" />
          <span className="lname">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
