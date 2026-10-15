/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DIVISION_ORDER } from '../lib/colors.js';
import { kindKey } from '../lib/places.js';

const MAX_RESULTS = 10;
const TYPE_RANK = { division: 0, district: 1, upazila: 2, seat: 3, thana: 4, union: 5 };
// Bangla letters like ড় / য় can be typed precomposed or as letter + nukta; compare in one form.
const fold = (s) => s.normalize('NFD').toLowerCase();
const toLatinDigits = (s) => s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));

// Searches Bangla and English names at the same time, whatever the active language.
// Thanas and unions join the index once their records are loaded (on first focus).
export default function SearchBar({ data, extra, onPick, onNeedData }) {
  const { t, name, num } = useLanguage();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const index = useMemo(() => {
    const list = [
      ...DIVISION_ORDER.map((id) => ({ type: 'division', item: data.divisionById[id] })),
      ...data.districts.map((d) => ({ type: 'district', item: d })),
      ...data.upazilas.map((u) => ({ type: 'upazila', item: u })),
      ...data.seats.map((s) => ({ type: 'seat', item: s })),
      ...(extra.thanas ?? []).map((x) => ({ type: 'thana', item: x })),
      ...(extra.unions ?? []).map((x) => ({ type: 'union', item: x })),
    ];
    for (const it of list) {
      it.en = fold(it.item.name_en);
      it.bn = fold(it.item.name_bn ?? '');
    }
    return list;
  }, [data, extra.thanas, extra.unions]);

  const hits = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [];
    // A plain number (in Bangla or Latin digits) finds the seat with that number.
    const asNumber = /^[0-9০-৯]{1,3}$/.test(q) ? Number(toLatinDigits(q)) : null;
    if (asNumber) return index.filter((it) => it.type === 'seat' && it.item.seat === asNumber);
    const starts = (it) => (it.en.startsWith(q) || it.bn.startsWith(q) ? 0 : 1);
    return index
      .filter((it) => it.en.includes(q) || it.bn.includes(q))
      .sort((a, b) => starts(a) - starts(b) || TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.en.localeCompare(b.en))
      .slice(0, MAX_RESULTS);
  }, [index, query]);

  // Parent shown on the right of each result.
  const parentOf = (hit) => {
    const it = hit.item;
    if (hit.type === 'division') return '';
    if (hit.type === 'seat') return `#${num(it.seat)}`;
    if (hit.type === 'district') return name(data.divisionById[it.division_id]);
    if (hit.type === 'upazila') return name(data.districtById[it.district_id]);
    const upz = data.upazilaById[it.upazila_id];
    return upz ? `${name(upz)}, ${name(data.districtById[upz.district_id])}` : '';
  };

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
        onFocus={() => {
          setOpen(true);
          onNeedData();
        }}
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
              <span className="type">{t(kindKey(hit.type, hit.item))}</span>
              <span className="rname">{name(hit.item)}</span>
              <span className="sub">{parentOf(hit)}</span>
            </button>
          ))
        ) : (
          <div className="empty">{t('noResults')}</div>
        )}
      </div>
    </div>
  );
}
