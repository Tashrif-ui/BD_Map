/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { loadData, loadThanas, loadUnions } from './lib/data.js';
import { DEFAULT_LAYERS, LAYER_FOR_TYPE, UNION_MIN_ZOOM } from './lib/layers.js';
import { exportMapImage } from './lib/exportImage.js';
import { getPlace, kindKey } from './lib/places.js';
import { MOBILE_QUERY, useMediaQuery } from './lib/useMediaQuery.js';
import AboutDialog from './components/AboutDialog.jsx';
import AppBar from './components/AppBar.jsx';
import BangladeshMap from './components/BangladeshMap.jsx';
import DetailsPanel from './components/DetailsPanel.jsx';
import Footer from './components/Footer.jsx';
import LayerPanel from './components/LayerPanel.jsx';

export default function App() {
  const { t, name } = useLanguage();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const detailsRef = useRef(null);
  const mapRef = useRef(null); // the Leaflet map, for image export

  const [data, setData] = useState(null);
  const [extra, setExtra] = useState({}); // thana + union records, loaded on demand
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null); // { type, id }
  const [flyKey, setFlyKey] = useState(null); // changes on every selection; { fly } = move the map
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [zoom, setZoom] = useState(7);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const hashReady = useRef(false); // the URL is only written after the initial link was read

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

  // Shareable links: the selected area lives in the URL hash, e.g. #seat/seat-186.
  useEffect(() => {
    if (!data) return undefined;
    const SYNC = { division: data.divisionById, district: data.districtById, upazila: data.upazilaById, seat: data.seatById };
    const LAZY = { thana: () => loadThanas().then((r) => r.thanaById), union: () => loadUnions().then((r) => r.unionById) };
    const apply = async () => {
      const m = window.location.hash.match(/^#([a-z]+)\/([a-z0-9-]+)$/);
      if (!m) return;
      const [, type, id] = m;
      const known = SYNC[type] ?? (LAZY[type] ? await LAZY[type]().catch(() => null) : null);
      if (known?.[id]) select(type, id, true);
    };
    apply().finally(() => (hashReady.current = true));
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [data, select]);
  useEffect(() => {
    if (!hashReady.current) return;
    const hash = selected ? `#${selected.type}/${selected.id}` : '';
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash || window.location.pathname + window.location.search);
  }, [selected]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const copyLink = () =>
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => showToast(t('linkCopied')))
      .catch(() => showToast(window.location.href));

  const saveImage = () => {
    if (!mapRef.current) return;
    const place = getPlace(data, extra, selected);
    showToast(t('exporting'));
    exportMapImage(mapRef.current, {
      title: `${place ? name(place) : t('bangladesh')} — BD-Map`,
      fileName: `bd-map-${selected ? selected.id : 'bangladesh'}.png`,
    }).catch((err) => {
      console.error(err);
      showToast(t('exportFailed'));
    });
  };

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
              mapRef={mapRef}
              onSelect={select}
              onZoom={setZoom}
            />
          )}
          {!data && <div className={`app-state${loadError ? ' error' : ''}`}>{loadError ? t('loadError') : t('loading')}</div>}
          <div className="map-chip">{chip}</div>
          {data && (
            <div className="map-tools">
              <button className="icon-btn" type="button" title={t('exportImage')} aria-label={t('exportImage')} onClick={saveImage}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </button>
              <button className="icon-btn" type="button" title={t('copyLink')} aria-label={t('copyLink')} onClick={copyLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                  <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
              </button>
            </div>
          )}
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

      <Footer onAbout={() => setAboutOpen(true)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
