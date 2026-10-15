/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { forwardRef, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DIVISION_COLORS, DIVISION_ORDER } from '../lib/colors.js';

function Row({ label, children, pending }) {
  return (
    <div className="row">
      <span>{label}</span>
      <span className={pending ? 'pending' : undefined}>{children}</span>
    </div>
  );
}

function Sources({ data }) {
  const { t, num } = useLanguage();
  return (
    <div className="source">
      {t('sourceDiv')}
      <br />
      {t('sourceDist')}
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

const DetailsPanel = forwardRef(function DetailsPanel({ data, selected, open, onSelect }, ref) {
  const { t, num, name, altName, lang } = useLanguage();
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

  let body;
  if (!data) {
    body = null;
  } else if (!selected) {
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
        <h3 style={{ marginTop: 22 }}>{t('divisions')}</h3>
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
  } else if (selected.type === 'division') {
    const d = data.divisionById[selected.id];
    const list = d.district_ids
      .map((id) => data.districtById[id])
      .sort((a, b) => name(a).localeCompare(name(b), lang));
    body = (
      <>
        <nav className="crumbs">
          <button type="button" onClick={() => onSelect(null)}>
            {t('bangladesh')}
          </button>
          › <span>{name(d)}</span>
        </nav>
        <Kind color={DIVISION_COLORS[d.id]}>{t('division')}</Kind>
        <h2 className="detail-title">{name(d)}</h2>
        <div className="detail-sub">{altName(d)}</div>
        <div className="rows">
          <Row label={t('districts')}>{num(list.length)}</Row>
          <Row label={t('upazilas')} pending>
            {t('pending', { p: 4 })}
          </Row>
          <Row label={t('constituencies')} pending>
            {t('pending', { p: 5 })}
          </Row>
        </div>
        <h3 style={{ marginTop: 20 }}>{t('districtsIn')}</h3>
        <div className="chips">
          {list.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect('district', p.id)}>
              {name(p)}
            </button>
          ))}
        </div>
        <Sources data={data} />
      </>
    );
  } else {
    const p = data.districtById[selected.id];
    const dv = data.divisionById[p.division_id];
    body = (
      <>
        <nav className="crumbs">
          <button type="button" onClick={() => onSelect(null)}>
            {t('bangladesh')}
          </button>
          ›
          <button type="button" onClick={() => onSelect('division', dv.id)}>
            {name(dv)}
          </button>
          › <span>{name(p)}</span>
        </nav>
        <Kind color="var(--red)">{t('district')}</Kind>
        <h2 className="detail-title">{name(p)}</h2>
        <div className="detail-sub">{altName(p)}</div>
        <div className="rows">
          <Row label={t('division')}>
            <button type="button" className="link" onClick={() => onSelect('division', dv.id)}>
              {name(dv)}
            </button>
          </Row>
          <Row label={t('upazilas')} pending>
            {t('pending', { p: 4 })}
          </Row>
          <Row label={t('thanas')} pending>
            {t('pending', { p: 4 })}
          </Row>
          <Row label={t('constituencies')} pending>
            {t('pending', { p: 5 })}
          </Row>
        </div>
        <Sources data={data} />
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
