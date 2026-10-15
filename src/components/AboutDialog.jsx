/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const REPO = 'https://github.com/Tashrif-ui/BD_Map';

// About page (PROJECT.md Rule 2): author, how to credit, license and data sources.
export default function AboutDialog({ open, onClose }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal-close" type="button" aria-label={t('close')} onClick={onClose}>
          ×
        </button>
        <h2 id="about-title">{t('aboutTitle')}</h2>
        <p>{t('aboutIntro')}</p>

        <h3>{t('aboutAuthor')}</h3>
        <p>
          <b>Tashrif Alam</b> — © 2026. <a href={REPO} target="_blank" rel="noopener">{REPO.replace('https://', '')}</a>
        </p>

        <h3>{t('aboutCreditTitle')}</h3>
        <p>{t('aboutCreditText')}</p>
        <blockquote>Data/visualization from BD-Map by Tashrif Alam — {REPO}</blockquote>

        <h3>{t('aboutLicenseTitle')}</h3>
        <p>{t('aboutLicenseText')}</p>

        <h3>{t('aboutSourcesTitle')}</h3>
        <ul>
          <li>{t('sourceAdmin')}</li>
          <li>{t('sourceLocal')}</li>
          <li>{t('sourceNames')}</li>
          <li>{t('sourceSeat')}</li>
        </ul>
        <p className="note">{t('aboutAccuracy')}</p>
      </div>
    </div>
  );
}
