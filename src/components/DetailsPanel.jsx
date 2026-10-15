/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { forwardRef, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DIVISION_COLORS, DIVISION_ORDER } from '../lib/colors.js';
import { divisionOf, getParents, getPlace, kindKey } from '../lib/places.js';

function Row({ label, children, pending }) {
  return (
    <div className="row">
      <span>{label}</span>
      <span className={pending ? 'pending' : undefined}>{children}</span>
    </div>
  );
}

function Sources({ data, local }) {
  const { t, num } = useLanguage();
  return (
    <div className="source">
      {t('sourceAdmin')}
      <br />
      {local && (
        <>
          {t('sourceLocal')}
          <br />
        </>
      )}
      {t('sourceNames')}
      <br />
      {t('verified')}: {num(data.lastVerified)}
    </div>
  );
}

function Kind({ color, children }) {
  return (
    <div className="kind" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <i style={{ background: color }} />
      {children}
    </div>
  );
}

function Chips({ items, type, onSelect }) {
  const { name, lang } = useLanguage();
  const sorted = [...items].sort((a, b) => name(a).localeCompare(name(b), lang));
  return (
    <div className="chips">
      {sorted.map((p) => (
        <button key={p.id} type="button" onClick={() => onSelect(type, p.id)}>
          {name(p)}
        </button>
      ))}
    </div>
  );
}

const DetailsPanel = forwardRef(function DetailsPanel({ data, extra, selected, open, onSelect }, ref) {
  const { t, num, name, altName } = useLanguage();
  const innerRef = useRef(null);

  // Start at the top whenever a new area is shown.
  useLayoutEffect(() => {
    if (innerRef.current) innerRef.current.scrollTop = 0;
  }, [selected?.type, selected?.id]);

  const setRefs = (el) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  const place = data && selected ? getPlace(data, extra, selected) : null;
  let body = null;

  if (data && !selected) {
    body = (
      <div className="welcome">
        <h2 className="detail-title">{t('welcomeTitle')}</h2>
        <p>{t('welcomeText')}</p>
        <div className="hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <span>{t('hint')}</span>
        </div>
        <h3>{t('divisions')}</h3>
        <div className="chips">
          {DIVISION_ORDER.map((id) => (
            <button key={id} type="button" onClick={() => onSelect('division', id)}>
              {name(data.divisionById[id])}
            </button>
          ))}
        </div>
        <Sources data={data} />
      </div>
    );
  } else if (data && selected && !place) {
    body = <p className="detail-sub">{t('loadingShort')}</p>;
  } else if (place) {
    const parents = getParents(data, extra, selected);
    const divisionId = divisionOf(data, extra, selected);
    const color =
      selected.type === 'district' ? 'var(--red)' : DIVISION_COLORS[selected.type === 'division' ? place.id : divisionId];
    const seatsPending = (
      <Row label={t('constituencies')} pending>
        {t('pending', { p: 5 })}
      </Row>
    );
    const link = (type, p) => (
      <button type="button" className="link" onClick={() => onSelect(type, p.id)}>
        {name(p)}
      </button>
    );

    let rows = null;
    let lists = null;
    if (selected.type === 'division') {
      const districts = place.district_ids.map((id) => data.districtById[id]);
      rows = (
        <>
          <Row label={t('districts')}>{num(districts.length)}</Row>
          <Row label={t('upazilas')}>{num(data.upazilas.filter((u) => u.division_id === place.id).length)}</Row>
          {seatsPending}
        </>
      );
      lists = (
        <>
          <h3>{t('districtsIn')}</h3>
          <Chips items={districts} type="district" onSelect={onSelect} />
        </>
      );
    } else if (selected.type === 'district') {
      const upazilas = place.upazila_ids.map((id) => data.upazilaById[id]);
      rows = (
        <>
          <Row label={t('division')}>{link('division', data.divisionById[place.division_id])}</Row>
          <Row label={t('upazilas')}>{num(upazilas.length)}</Row>
          {seatsPending}
        </>
      );
      lists = (
        <>
          <h3>{t('upazilasIn')}</h3>
          <Chips items={upazilas} type="upazila" onSelect={onSelect} />
        </>
      );
    } else if (selected.type === 'upazila') {
      const unions = extra.unionsByUpazila ? extra.unionsByUpazila[place.id] ?? [] : null;
      const thanas = extra.thanas ? extra.thanas.filter((x) => x.upazila_id === place.id) : null;
      rows = (
        <>
          <Row label={t('district')}>{link('district', data.districtById[place.district_id])}</Row>
          <Row label={t('division')}>{link('division', data.divisionById[place.division_id])}</Row>
          <Row label={t('unionsIn')}>{unions ? num(unions.length) : t('loadingShort')}</Row>
          <Row label={t('thanas')}>{thanas ? num(thanas.length) : t('loadingShort')}</Row>
          {seatsPending}
        </>
      );
      lists = (
        <>
          {unions?.length > 0 && (
            <>
              <h3>{t('unionsIn')}</h3>
              <Chips items={unions} type="union" onSelect={onSelect} />
            </>
          )}
          {thanas?.length > 0 && (
            <>
              <h3>{t('thanasIn')}</h3>
              <Chips items={thanas} type="thana" onSelect={onSelect} />
            </>
          )}
        </>
      );
    } else {
      // thana or union
      const upz = data.upazilaById[place.upazila_id];
      rows = (
        <>
          {selected.type === 'union' && <Row label={t('type')}>{t(kindKey('union', place))}</Row>}
          <Row label={t(kindKey('upazila', upz))}>{link('upazila', upz)}</Row>
          <Row label={t('district')}>{link('district', data.districtById[upz.district_id])}</Row>
          <Row label={t('division')}>{link('division', data.divisionById[upz.division_id])}</Row>
          {selected.type === 'union' && seatsPending}
        </>
      );
      lists = selected.type === 'thana' ? <p className="note">{t('thanaNote')}</p> : null;
    }

    body = (
      <>
        <nav className="crumbs">
          <button type="button" onClick={() => onSelect(null)}>
            {t('bangladesh')}
          </button>
          {parents.map((p) => (
            <span key={p.id}>
              {' › '}
              <button type="button" onClick={() => onSelect(p.type, p.id)}>
                {name(p.place)}
              </button>
            </span>
          ))}
          <span>
            {' › '}
            {name(place)}
          </span>
        </nav>
        <Kind color={color}>{t(kindKey(selected.type, place))}</Kind>
        <h2 className="detail-title">{name(place)}</h2>
        <div className="detail-sub">{altName(place) || (place.name_bn ? '' : t('noBangla'))}</div>
        <div className="rows">{rows}</div>
        {lists}
        <Sources data={data} local={selected.type === 'thana' || selected.type === 'union' || selected.type === 'upazila'} />
      </>
    );
  }

  return (
    <aside className={`panel right${open ? ' open' : ''}`} ref={setRefs} aria-live="polite">
      <span className="sheet-handle" />
      {selected && (
        <button className="close-sheet" type="button" aria-label={t('close')} onClick={() => onSelect(null)}>
          ×
        </button>
      )}
      {body}
    </aside>
  );
});

export default DetailsPanel;
