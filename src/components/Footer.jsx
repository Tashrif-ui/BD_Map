/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useLanguage } from '../context/LanguageContext.jsx';

// Owner credit (PROJECT.md Rule 2) — must stay visible in both themes and on mobile.
export default function Footer({ onAbout }) {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <span>
        © 2026 <b>Tashrif Alam</b> — BD-Map
        <span className="f-lic"> · {t('license')}</span> ·{' '}
        <button type="button" className="link" onClick={onAbout}>
          {t('about')}
        </button>
      </span>
      <span className="f-right">{t('footerRight')}</span>
    </footer>
  );
}
