/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DIVISION_ORDER } from '../lib/colors.js';

const MAX_RESULTS = 8;

// Searches Bangla and English names at the same time, whatever the active language.
export default function SearchBar({ data, onPick }) {
  const { t, name, altName } = useLanguage();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const index = useMemo(
    () => [
      ...DIVISION_ORDER.map((id) => ({ type: 'division', item: data.divisionById[id] })),
      ...data.districts.map((d) => ({ type: 'district', item: d })),
    ],
    [data],
  );

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const startsWith = (it) => it.item.name_en.toLowerCase().startsWith(q) || it.item.name_bn.startsWith(q);
    return index
      .filter((it) => it.item.name_en.toLowerCase().includes(q) || it.item.name_bn.includes(q))
      .sort((a, b) => startsWith(b) - startsWith(a) || (a.type === 'division' ? -1 : 1))
      .slice(0, MAX_RESULTS);
  }, [index, query]);

  const pick = (hit) => {
    if (!hit) return;
    setQuery('');
    setOpen(false);
    onPick(hit.type, hit.item.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (hits.length) setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      pick(hits[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="search" role="search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        autoComplete="off"
        placeholder={t('searchPh')}
        aria-label={t('search')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <div className={`results${open && query.trim() ? ' open' : ''}`} role="listbox">
        {hits.length ? (
          hits.map((hit, i) => (
            <button
              key={hit.type + hit.item.id}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`result${i === active ? ' active' : ''}`}
              // mousedown so the pick happens before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                pick(hit);
              }}
            >
              <span className="type">{hit.type === 'division' ? t('division') : t('district')}</span>
              <span>{name(hit.item)}</span>
              <span className="sub">
                {hit.type === 'district' ? name(data.divisionById[hit.item.division_id]) : altName(hit.item)}
              </span>
            </button>
          ))
        ) : (
          <div className="empty">{t('noResults')}</div>
        )}
      </div>
    </div>
  );
}
