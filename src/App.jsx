/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { loadData, loadThanas, loadUnions } from './lib/data.js';
import { DEFAULT_LAYERS, LAYER_FOR_TYPE, UNION_MIN_ZOOM } from './lib/layers.js';
import { getPlace, kindKey } from './lib/places.js';
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
  const [extra, setExtra] = useState({}); // thana + union records, loaded on demand
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null); // { type, id }
  const [flyKey, setFlyKey] = useState(null); // changes on every selection; { fly } = move the map
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [zoom, setZoom] = useState(7);
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

  const needThanas = () => loadThanas().then((r) => setExtra((e) => (e.thanaById ? e : { ...e, ...r })));
  const needUnions = () => loadUnions().then((r) => setExtra((e) => (e.unionById ? e : { ...e, ...r })));

  // Load thana / union records when a layer, a selection or the details panel needs them.
  useEffect(() => {
    if (layers.thana || selected?.type === 'thana' || selected?.type === 'upazila') needThanas().catch(console.error);
    if (layers.union || selected?.type === 'union' || selected?.type === 'upazila') needUnions().catch(console.error);
  }, [layers.thana, layers.union, selected?.type]);

  // type = null clears the selection. fly = also move the map to it.
  const select = useCallback((type, id, fly = true) => {
    setSelected(type ? { type, id } : null);
    setFlyKey({ fly });
    setDrawerOpen(false);
    // Make sure the layer that shows the selected place is visible.
    const layer = LAYER_FOR_TYPE[type];
    if (layer && type !== 'division') setLayers((l) => (l[layer] ? l : { ...l, [layer]: true }));
  }, []);

  const toggleLayer = useCallback((id, on) => setLayers((l) => ({ ...l, [id]: on })), []);

  const toastTimer = useRef(null);
  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  const showComingSoon = useCallback((phase) => showToast(t('comingToast', { p: phase })), [showToast, t]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  let chip = t('chipIdle');
  const place = data ? getPlace(data, extra, selected) : null;
  if (place) chip = `${t(kindKey(selected.type, place))}: ${name(place)}`;
  else if (selected) chip = t('loadingShort');
  else if (layers.union && zoom < UNION_MIN_ZOOM) chip = t('zoomForUnions');

  return (
    <>
      <AppBar
        data={data}
        extra={extra}
        onNeedSearchData={() => {
          needThanas().catch(console.error);
          needUnions().catch(console.error);
        }}
        onPick={(type, id) => select(type, id, true)}
        onHome={() => select(null, null, true)}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
      />

      <div className="app">
        <div className={`backdrop${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />
        <LayerPanel
          data={data}
          extra={extra}
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
              extra={extra}
              selected={selected}
              flyKey={flyKey}
              layers={layers}
              isMobile={isMobile}
              detailsRef={detailsRef}
              onSelect={select}
              onZoom={setZoom}
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
          extra={extra}
          selected={selected}
          open={!!selected}
          onSelect={(type, id) => select(type, id, true)}
        />
      </div>

      <Footer />
    </>
  );
}
