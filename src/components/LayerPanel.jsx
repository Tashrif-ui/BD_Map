/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useLanguage } from '../context/LanguageContext.jsx';
import { DIVISION_COLORS, DIVISION_ORDER } from '../lib/colors.js';
import { LAYERS } from '../lib/layers.js';

export default function LayerPanel({ data, extra, layers, open, onToggleLayer, onComingSoon, onSelectDivision, onClose }) {
  const { t, num, name } = useLanguage();

  return (
    <aside className={`panel left${open ? ' open' : ''}`}>
      <button className="close-drawer" type="button" aria-label={t('close')} onClick={onClose}>
        ×
      </button>

      <section>
        <h3>{t('layers')}</h3>
        {LAYERS.map((layer) => (
          <label key={layer.id} className={`layer${layer.phase ? ' disabled' : ''}`}>
            <input
              type="checkbox"
              checked={!!layers[layer.id]}
              aria-disabled={layer.phase ? 'true' : undefined}
              onChange={(e) => (layer.phase ? onComingSoon(layer.phase) : onToggleLayer(layer.id, e.target.checked))}
            />
            <span className="switch" />
            <span className="name">{t(layer.labelKey)}</span>
            {layer.phase && (
              <span className="soon">
                {t('phase')} {num(layer.phase)}
              </span>
            )}
          </label>
        ))}
      </section>

      <section>
        <h3>{t('atAGlance')}</h3>
        <div className="stats">
          {[
            [data?.divisions.length, 's_div'],
            [data?.districts.length, 's_dist'],
            [data?.upazilas.filter((u) => u.type === 'upazila').length, 's_upz2'],
            [data?.upazilas.filter((u) => u.type === 'city_corporation').length, 's_city'],
            [extra.unions?.filter((u) => u.type === 'union').length, 's_union'],
            [data?.seats.length, 's_seat'],
          ].map(([n, key]) => (
            <div key={key} className="stat">
              <b>{n == null ? '—' : num(n)}</b>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>
      </section>

      {data && (
        <section>
          <h3>{t('divisions')}</h3>
          <div className="legend">
            {DIVISION_ORDER.map((id) => (
              <button key={id} type="button" onClick={() => onSelectDivision(id)}>
                <i style={{ background: DIVISION_COLORS[id] }} />
                {name(data.divisionById[id])}
                <span className="count">{t('nDistricts', { n: data.divisionById[id].district_ids.length })}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
