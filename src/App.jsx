/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { loadData } from './lib/data.js';
import { DEFAULT_LAYERS } from './lib/layers.js';
import { MOBILE_QUERY, useMediaQuery } from './lib/useMediaQuery.js';
import AppBar from './components/AppBar.jsx';
import BangladeshMap from './components/BangladeshMap.jsx';
import DetailsPanel from './components/DetailsPanel.jsx';
import Footer from './components/Footer.jsx';
import LayerPanel from './components/LayerPanel.jsx';

export default function App() {
  const { t, name } = useLanguage();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const detailsRef = useRef(null);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null); // { type: 'division' | 'district', id }
  const [flyKey, setFlyKey] = useState(null); // changes on every selection; { fly } = move the map
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      });
  }, []);

  // type = null clears the selection. fly = also move the map to it.
  const select = useCallback((type, id, fly = true) => {
    setSelected(type ? { type, id } : null);
    setFlyKey({ fly });
    setDrawerOpen(false);
    if (type === 'district') setLayers((l) => (l.dist ? l : { ...l, dist: true }));
  }, []);

  const toggleLayer = useCallback((id, on) => setLayers((l) => ({ ...l, [id]: on })), []);

  const toastTimer = useRef(null);
  const showComingSoon = useCallback(
    (phase) => {
      setToast(t('comingToast', { p: phase }));
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2200);
    },
    [t],
  );

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  let chip = t('chipIdle');
  if (data && selected) {
    const place = selected.type === 'division' ? data.divisionById[selected.id] : data.districtById[selected.id];
    chip = `${selected.type === 'division' ? t('division') : t('district')}: ${name(place)}`;
  }

  return (
    <>
      <AppBar
        data={data}
        onPick={(type, id) => select(type, id, true)}
        onHome={() => select(null, null, true)}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
      />

      <div className="app">
        <div className={`backdrop${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />
        <LayerPanel
          data={data}
          layers={layers}
          open={drawerOpen}
          onToggleLayer={toggleLayer}
          onComingSoon={showComingSoon}
          onSelectDivision={(id) => select('division', id, true)}
          onClose={() => setDrawerOpen(false)}
        />

        <div className="map-wrap">
          {data && (
            <BangladeshMap
              data={data}
              selected={selected}
              flyKey={flyKey}
              layers={layers}
              isMobile={isMobile}
              detailsRef={detailsRef}
              onSelect={select}
            />
          )}
          {!data && <div className={`app-state${loadError ? ' error' : ''}`}>{loadError ? t('loadError') : t('loading')}</div>}
          <div className="map-chip">{chip}</div>
          <div className={`toast${toast ? ' show' : ''}`} role="status">
            {toast}
          </div>
        </div>

        <DetailsPanel
          ref={detailsRef}
          data={data}
          selected={selected}
          open={!!selected}
          onSelect={(type, id) => select(type, id, true)}
        />
      </div>

      <Footer />
    </>
  );
}
