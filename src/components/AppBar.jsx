/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import SearchBar from './SearchBar.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function AppBar({ data, onPick, onHome, onToggleDrawer }) {
  const { t } = useLanguage();
  return (
    <header className="appbar">
      <a
        className="logo"
        href="/"
        aria-label="BD-Map"
        onClick={(e) => {
          e.preventDefault();
          onHome();
        }}
      >
        <div className="logo-mark">
          <span />
        </div>
        <div className="logo-text">
          <b>BD-Map</b>
          <small>{t('tagline')}</small>
        </div>
      </a>
      <span className="badge-preview">{t('beta')}</span>

      {data ? <SearchBar data={data} onPick={onPick} /> : <div className="search" />}

      <div className="controls">
        <button className="icon-btn only-mobile" type="button" aria-label={t('openLayers')} onClick={onToggleDrawer}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 9 5-9 5-9-5 9-5Z" />
            <path d="m3 13 9 5 9-5" />
          </svg>
        </button>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
