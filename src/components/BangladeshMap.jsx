/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { DIVISION_COLORS } from '../lib/colors.js';

// Division labels whose bounding-box centre falls badly (coast, islands).
const DIV_LABEL_POS = { chattogram: [22.75, 91.75], khulna: [22.85, 89.25], barishal: [22.45, 90.3] };
const DISTRICT_LABEL_ZOOM = 8;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---------- Styles (depend on theme, selection and visible layers) ---------- */
function inFocus(ctx, divisionId, districtId) {
  const { selected, data } = ctx;
  if (!selected) return true;
  if (selected.type === 'division') return selected.id === divisionId;
  return districtId ? selected.id === districtId : data.districtById[selected.id].division_id === divisionId;
}

function divisionStyle(ctx, f) {
  const dark = ctx.theme === 'dark';
  const id = f.properties.id;
  return {
    stroke: false,
    fillColor: DIVISION_COLORS[id],
    // With districts on, the district shades carry the colour; divisions only draw outlines.
    fillOpacity: ctx.layers.dist ? 0 : inFocus(ctx, id) ? (dark ? 0.9 : 0.85) : dark ? 0.42 : 0.3,
  };
}

function divisionLineStyle(ctx) {
  return { color: ctx.theme === 'dark' ? '#0c110f' : '#ffffff', weight: 3, opacity: 1, fill: false };
}

function districtStyle(ctx, f) {
  const dark = ctx.theme === 'dark';
  const p = f.properties;
  const { selected, data } = ctx;
  const isSel = selected?.type === 'district' && selected.id === p.id;
  const focus = inFocus(ctx, p.division_id, selected?.type === 'district' ? p.id : null);
  const sameDivision = selected?.type === 'district' && data.districtById[selected.id].division_id === p.division_id;
  return {
    color: isSel ? (dark ? '#ffffff' : '#111111') : dark ? 'rgba(12,17,15,.55)' : 'rgba(255,255,255,.85)',
    weight: isSel ? 3.5 : 1,
    opacity: 1,
    fillColor: p.fill,
    fillOpacity: isSel ? 1 : focus ? (dark ? 0.9 : 0.85) : sameDivision ? 0.7 : dark ? 0.42 : 0.3,
  };
}

/* ---------- Component ---------- */
export default function BangladeshMap({ data, selected, flyKey, layers, isMobile, detailsRef, onSelect }) {
  const { theme } = useTheme();
  const { lang, name } = useLanguage();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const partsRef = useRef(null);

  // Leaflet event handlers read the latest props through this ref.
  const ctxRef = useRef(null);
  ctxRef.current = { data, selected, layers, theme, name, onSelect };

  /* Create the map once. */
  useEffect(() => {
    const ctx = () => ctxRef.current;
    const map = L.map(elRef.current, {
      minZoom: 6,
      maxZoom: 12,
      zoomSnap: 0.25,
      maxBounds: [
        [19.5, 86.0],
        [27.5, 94.5],
      ],
      maxBoundsViscosity: 0.8,
    });
    map.attributionControl.setPrefix('<b>BD-Map by Tashrif Alam</b>');
    map.attributionControl.addAttribution(
      'Boundaries: <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> · BBS / OCHA HDX',
    );
    map.createPane('divFill').style.zIndex = 400;
    map.createPane('distFill').style.zIndex = 410;
    const linePane = map.createPane('divLine');
    linePane.style.zIndex = 420;
    linePane.style.pointerEvents = 'none';
    const labelPane = map.createPane('labels');
    labelPane.style.zIndex = 450;
    labelPane.style.pointerEvents = 'none';

    const bounds = L.geoJSON(data.divisionShapes).getBounds();
    map.fitBounds(bounds, { padding: [20, 20] });

    const hoverTip = L.tooltip({ className: 'hover-tip', direction: 'top', offset: [0, -8] });

    const divFill = L.geoJSON(data.divisionShapes, {
      pane: 'divFill',
      style: (f) => divisionStyle(ctx(), f),
      onEachFeature: (f, layer) => {
        layer.on({
          click: () => ctx().onSelect('division', f.properties.id, false),
          mouseover: () => layer.setStyle({ fillOpacity: 1 }),
          mouseout: () => divFill.resetStyle(layer),
        });
      },
    });
    const divLines = L.geoJSON(data.divisionShapes, {
      pane: 'divLine',
      interactive: false,
      style: () => divisionLineStyle(ctx()),
    });
    const distFill = L.geoJSON(data.districtShapes, {
      pane: 'distFill',
      style: (f) => districtStyle(ctx(), f),
      onEachFeature: (f, layer) => {
        layer.on({
          click: () => ctx().onSelect('district', f.properties.id, false),
          mouseover: (e) => {
            const c = ctx();
            if (!(c.selected?.type === 'district' && c.selected.id === f.properties.id)) {
              layer.setStyle({ fillOpacity: 1, weight: 2.5, color: c.theme === 'dark' ? '#ffffff' : '#111111' });
              layer.bringToFront();
            }
            const division = c.data.divisionById[f.properties.division_id];
            hoverTip
              .setLatLng(e.latlng)
              .setContent(
                `${escapeHtml(c.name(f.properties))} · <span style="color:var(--muted)">${escapeHtml(c.name(division))}</span>`,
              )
              .openOn(map);
          },
          mousemove: (e) => hoverTip.setLatLng(e.latlng),
          mouseout: () => {
            distFill.resetStyle(layer);
            map.closeTooltip(hoverTip);
            bringSelectedToFront();
          },
        });
      },
    });
    const divLabels = L.layerGroup();
    const distLabels = L.layerGroup();

    function bringSelectedToFront() {
      const sel = ctx().selected;
      if (sel?.type !== 'district') return;
      distFill.eachLayer((l) => l.feature.properties.id === sel.id && l.bringToFront());
    }

    function updateZoomClass() {
      const z = map.getZoom();
      elRef.current.classList.toggle('z-low', z < DISTRICT_LABEL_ZOOM);
      elRef.current.classList.toggle('z-high', z >= DISTRICT_LABEL_ZOOM && map.hasLayer(distFill));
    }
    map.on('zoomend', updateZoomClass);

    partsRef.current = { map, bounds, divFill, divLines, distFill, divLabels, distLabels, bringSelectedToFront, updateZoomClass };
    mapRef.current = map;

    // Keep the map sized to its box (panels opening, rotation, window resize).
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        map.invalidateSize();
        if (!ctx().selected) map.fitBounds(bounds, { padding: [20, 20] });
      }, 150);
    });
    ro.observe(elRef.current);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      partsRef.current = null;
    };
  }, [data]);

  /* Labels follow the language. */
  useEffect(() => {
    const p = partsRef.current;
    p.divLabels.clearLayers();
    p.distLabels.clearLayers();
    p.divFill.eachLayer((l) => {
      const props = l.feature.properties;
      L.tooltip({ permanent: true, direction: 'center', className: 'lbl lbl-div', pane: 'labels' })
        .setLatLng(DIV_LABEL_POS[props.id] || l.getBounds().getCenter())
        .setContent(escapeHtml(name(props)))
        .addTo(p.divLabels);
    });
    p.distFill.eachLayer((l) => {
      L.tooltip({ permanent: true, direction: 'center', className: 'lbl lbl-dist', pane: 'labels' })
        .setLatLng(l.getBounds().getCenter())
        .setContent(escapeHtml(name(l.feature.properties)))
        .addTo(p.distLabels);
    });
  }, [data, lang, name]);

  /* Show / hide layers. */
  useEffect(() => {
    const p = partsRef.current;
    const show = (layer, on) => (on ? layer.addTo(p.map) : p.map.removeLayer(layer));
    [p.divFill, p.divLines, p.divLabels].forEach((l) => show(l, layers.div));
    [p.distFill, p.distLabels].forEach((l) => show(l, layers.dist));
    p.updateZoomClass();
  }, [data, layers.div, layers.dist]);

  /* Restyle on theme / selection / layer changes. */
  useEffect(() => {
    const p = partsRef.current;
    p.divFill.setStyle((f) => divisionStyle(ctxRef.current, f));
    p.divLines.setStyle(() => divisionLineStyle(ctxRef.current));
    p.distFill.setStyle((f) => districtStyle(ctxRef.current, f));
    p.bringSelectedToFront();
  }, [data, theme, selected?.type, selected?.id, layers.div, layers.dist]);

  /* Move the view when asked (search, list click) and, on mobile, so the area is not under the sheet. */
  useEffect(() => {
    if (!flyKey) return;
    const p = partsRef.current;
    if (!selected) {
      if (flyKey.fly) p.map.flyToBounds(p.bounds, { padding: [20, 20], duration: 0.6 });
      return;
    }
    if (!flyKey.fly && !isMobile) return;
    const group = selected.type === 'division' ? p.divFill : p.distFill;
    let target = null;
    group.eachLayer((l) => {
      if (l.feature.properties.id === selected.id) target = l;
    });
    if (!target) return;

    const opts = { paddingTopLeft: [30, 30], paddingBottomRight: [30, 30], duration: 0.6 };
    if (isMobile && detailsRef.current) {
      const sheet = detailsRef.current.getBoundingClientRect();
      const box = elRef.current.getBoundingClientRect();
      opts.paddingTopLeft = [20, 56];
      opts.paddingBottomRight =
        sheet.width >= box.width - 1
          ? [20, Math.min(sheet.height, box.height * 0.6) + 16] // bottom sheet
          : [sheet.width + 16, 20]; // landscape side sheet
    }
    opts.maxZoom = selected.type === 'district' ? (isMobile ? 8.25 : 8.5) : isMobile ? 7.5 : 8;
    p.map.flyToBounds(target.getBounds(), opts);
    // flyKey changes on every selection; the other values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);

  return <div id="map" ref={elRef} className="z-low" aria-label="Map of Bangladesh" />;
}
