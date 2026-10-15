/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { DIVISION_COLORS } from '../lib/colors.js';
import { loadSeatShapes, loadThanas, loadUnions, loadUnionShapes, loadUpazilaShapes } from '../lib/data.js';
import { UNION_MIN_ZOOM } from '../lib/layers.js';

// Division labels whose bounding-box centre falls badly (coast, islands).
const DIV_LABEL_POS = { chattogram: [22.75, 91.75], khulna: [22.85, 89.25], barishal: [22.45, 90.3] };
// Which name labels show at which zoom (one level at a time keeps the map readable).
const LABEL_ZOOM = { dist: 8, upz: 9.25, union: 10.5 };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---------- Styles (depend on theme, selection and visible layers) ---------- */
// Division / district / upazila of the current selection.
function focusOf(ctx) {
  const { selected: sel, data, extra } = ctx;
  if (!sel) return null;
  if (sel.type === 'division') return { division: sel.id };
  if (sel.type === 'district') return { division: data.districtById[sel.id]?.division_id, district: sel.id };
  if (sel.type === 'seat') {
    const d = data.districtById[data.seatById[sel.id]?.district_id];
    return d ? { division: d.division_id, district: d.id } : null;
  }
  let upz = null;
  if (sel.type === 'upazila') upz = data.upazilaById[sel.id];
  else if (sel.type === 'thana') upz = data.upazilaById[extra.thanaById?.[sel.id]?.upazila_id];
  else if (sel.type === 'union') upz = data.upazilaById[extra.unionById?.[sel.id]?.upazila_id];
  return upz ? { division: upz.division_id, district: upz.district_id, upazila: upz.id } : null;
}

// level 0 = in focus, 1 = same division as the focus, 2 = elsewhere
const fillOpacity = (dark, level) => [dark ? 0.9 : 0.85, 0.7, dark ? 0.42 : 0.3][level];

function divisionStyle(ctx, f) {
  const dark = ctx.theme === 'dark';
  const focus = focusOf(ctx);
  const level = !focus || focus.division === f.properties.id ? 0 : 2;
  return {
    stroke: false,
    fillColor: DIVISION_COLORS[f.properties.id],
    // With districts on, the district shades carry the colour; divisions only draw outlines.
    fillOpacity: ctx.layers.dist ? 0 : fillOpacity(dark, level),
  };
}

function divisionLineStyle(ctx) {
  return { color: ctx.theme === 'dark' ? '#0c110f' : '#ffffff', weight: 3, opacity: 1, fill: false };
}

function districtStyle(ctx, f) {
  const dark = ctx.theme === 'dark';
  const p = f.properties;
  const focus = focusOf(ctx);
  const isSel = ctx.selected?.type === 'district' && ctx.selected.id === p.id;
  let level = 0;
  if (focus && !isSel) {
    if (focus.district) level = focus.district === p.id ? 0 : focus.division === p.division_id ? 1 : 2;
    else level = focus.division === p.division_id ? 0 : 2;
  }
  return {
    color: isSel ? (dark ? '#ffffff' : '#111111') : dark ? 'rgba(12,17,15,.55)' : 'rgba(255,255,255,.85)',
    weight: isSel ? 3.5 : 1,
    opacity: 1,
    fillColor: p.fill,
    fillOpacity: isSel ? 1 : fillOpacity(dark, level),
  };
}

// Upazila, thana and union outlines sit on top of the district colours.
const OVERLAY_LINE = {
  upazila: { light: 'rgba(23,32,28,.6)', dark: 'rgba(230,240,235,.55)', weight: 0.9 },
  thana: { light: '#5b3fb3', dark: '#c9b8ff', weight: 1, dashArray: '4 3' },
  union: { light: 'rgba(23,32,28,.45)', dark: 'rgba(230,240,235,.4)', weight: 0.6 },
  seat: { light: '#1d1145', dark: '#ffe08a', weight: 2 },
};

function overlayStyle(kind, ctx, f) {
  const dark = ctx.theme === 'dark';
  const s = OVERLAY_LINE[kind];
  const isSel = ctx.selected?.type === kind && ctx.selected.id === f.properties.id;
  if (isSel)
    return { color: dark ? '#ffffff' : '#111111', weight: 3.5, opacity: 1, fillColor: '#ffffff', fillOpacity: dark ? 0.22 : 0.4, dashArray: null };
  // Without the district colours underneath, upazilas take their district's shade.
  const ownFill = kind === 'upazila' && !ctx.layers.dist;
  return {
    color: dark ? s.dark : s.light,
    weight: s.weight,
    opacity: 1,
    // Seats whose boundary is only partly known are drawn dashed.
    dashArray: kind === 'seat' && f.properties.quality !== 'complete' ? '6 5' : s.dashArray ?? null,
    fillColor: ownFill ? ctx.districtFill[f.properties.district_id] : '#000',
    fillOpacity: ownFill ? fillOpacity(dark, 0) : 0, // transparent but still clickable
  };
}

/* ---------- Component ---------- */
export default function BangladeshMap({ data, extra, selected, flyKey, layers, isMobile, detailsRef, mapRef, onSelect, onZoom }) {
  const { theme } = useTheme();
  const { lang, name, num } = useLanguage();
  const elRef = useRef(null);
  const partsRef = useRef(null);

  const districtFill = useRef(null);
  if (!districtFill.current)
    districtFill.current = Object.fromEntries(data.districtShapes.features.map((f) => [f.properties.id, f.properties.fill]));

  // Leaflet event handlers read the latest props through this ref.
  const ctxRef = useRef(null);
  ctxRef.current = { data, extra, selected, layers, theme, name, num, onSelect, onZoom, districtFill: districtFill.current };

  /* Create the map once. */
  useEffect(() => {
    const ctx = () => ctxRef.current;
    const map = L.map(elRef.current, {
      minZoom: 6,
      maxZoom: 13,
      zoomSnap: 0.25,
      maxBounds: [
        [19.5, 86.0],
        [27.5, 94.5],
      ],
      maxBoundsViscosity: 0.8,
    });
    map.attributionControl.setPrefix('<b>BD-Map by Tashrif Alam</b>');
    map.attributionControl.addAttribution(
      'Boundaries: <a href="https://data.humdata.org/dataset/cod-ab-bgd" target="_blank" rel="noopener">OCHA COD-AB</a> (BBS) · ' +
        '<a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a>',
    );
    const pane = (paneName, z, interactive = true) => {
      const el = map.createPane(paneName);
      el.style.zIndex = z;
      if (!interactive) el.style.pointerEvents = 'none';
    };
    pane('divFill', 400);
    pane('distFill', 405);
    pane('upzFill', 410);
    pane('thanaFill', 412);
    pane('unionFill', 414);
    pane('seatFill', 416);
    pane('divLine', 420, false);
    pane('labels', 450, false);

    const bounds = L.geoJSON(data.divisionShapes).getBounds();
    map.fitBounds(bounds, { padding: [20, 20] });

    const hoverTip = L.tooltip({ className: 'hover-tip', direction: 'top', offset: [0, -8] });
    const showTip = (e, html) => hoverTip.setLatLng(e.latlng).setContent(html).openOn(map);
    const subtitle = (text) => ` · <span style="color:var(--muted)">${escapeHtml(text)}</span>`;

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
    const divLines = L.geoJSON(data.divisionShapes, { pane: 'divLine', interactive: false, style: () => divisionLineStyle(ctx()) });
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
            showTip(e, escapeHtml(c.name(f.properties)) + subtitle(c.name(c.data.divisionById[f.properties.division_id])));
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

    // Upazila / thana / union layers start empty and are filled when first needed.
    function makeOverlay(kind, paneName) {
      const group = L.geoJSON(null, {
        pane: paneName,
        style: (f) => overlayStyle(kind, ctx(), f),
        onEachFeature: (f, layer) => {
          layer.on({
            click: () => ctx().onSelect(kind, f.properties.id, false),
            mouseover: (e) => {
              const c = ctx();
              if (!(c.selected?.type === kind && c.selected.id === f.properties.id)) {
                const ink = c.theme === 'dark' ? '#ffffff' : '#111111';
                layer.setStyle({ weight: 2.5, color: ink, fillColor: ink, fillOpacity: 0.12 });
                layer.bringToFront();
              }
              const parentUpz = kind === 'thana' ? c.extra.thanaById?.[f.properties.id]?.upazila_id : f.properties.upazila_id;
              const parent =
                kind === 'upazila' || kind === 'seat' ? c.data.districtById[f.properties.district_id] : c.data.upazilaById[parentUpz];
              showTip(e, escapeHtml(c.name(f.properties)) + (parent ? subtitle(c.name(parent)) : ''));
            },
            mousemove: (e) => hoverTip.setLatLng(e.latlng),
            mouseout: () => {
              group.resetStyle(layer);
              map.closeTooltip(hoverTip);
              bringSelectedToFront();
            },
          });
        },
      });
      return group;
    }
    const overlays = {
      upazila: makeOverlay('upazila', 'upzFill'),
      thana: makeOverlay('thana', 'thanaFill'),
      union: makeOverlay('union', 'unionFill'),
      seat: makeOverlay('seat', 'seatFill'),
    };

    const labels = { div: L.layerGroup(), dist: L.layerGroup(), upz: L.layerGroup(), union: L.layerGroup(), seat: L.layerGroup() };

    function bringSelectedToFront() {
      const sel = ctx().selected;
      if (!sel) return;
      const group = { district: distFill, ...overlays }[sel.type];
      group?.eachLayer((l) => l.feature.properties.id === sel.id && l.bringToFront());
    }

    // Show only one level of name labels for the current zoom.
    function updateLabels() {
      const z = map.getZoom();
      const on = ctx().layers;
      let mode = 'none';
      if (on.union && z >= LABEL_ZOOM.union) mode = 'union';
      else if (on.upz && z >= LABEL_ZOOM.upz) mode = 'upz';
      else if (on.seat) mode = 'seat';
      else if (on.dist && (z >= LABEL_ZOOM.dist || !on.div)) mode = 'dist';
      else if (on.div) mode = 'div';
      for (const [k, g] of Object.entries(labels)) {
        if (k === mode) g.addTo(map);
        else map.removeLayer(g);
      }
    }

    function labelFor(kind, props, pos) {
      return L.tooltip({ permanent: true, direction: 'center', className: `lbl lbl-${kind}`, pane: 'labels' })
        .setLatLng(pos)
        // Seats are labelled with their number, places with their name.
        .setContent(escapeHtml(kind === 'seat' ? ctx().num(props.seat) : ctx().name(props)));
    }
    function addLabels(kind, group, ids) {
      group.eachLayer((l) => {
        // City wards are too small and too many to label; their name shows on hover.
        if (kind === 'union' && l.feature.properties.type === 'ward') return;
        if (!ids || ids.has(l.feature.properties.id))
          labelFor(kind, l.feature.properties, l.getBounds().getCenter()).addTo(labels[kind]);
      });
    }
    function rebuildLabels() {
      for (const g of Object.values(labels)) g.clearLayers();
      divFill.eachLayer((l) => {
        const p = l.feature.properties;
        labelFor('div', p, DIV_LABEL_POS[p.id] || l.getBounds().getCenter()).addTo(labels.div);
      });
      addLabels('dist', distFill);
      addLabels('upz', overlays.upazila);
      addLabels('union', overlays.union);
      addLabels('seat', overlays.seat);
    }

    let upazilasLoaded = null;
    const ensureUpazilas = () =>
      (upazilasLoaded ||= loadUpazilaShapes().then((fc) => {
        if (!partsRef.current) return;
        overlays.upazila.addData(fc);
        addLabels('upz', overlays.upazila);
      }));
    let thanasLoaded = null;
    const ensureThanas = () =>
      (thanasLoaded ||= loadThanas().then(({ thanaShapes }) => {
        if (partsRef.current) overlays.thana.addData(thanaShapes);
      }));

    let seatsLoaded = null;
    const ensureSeats = () =>
      (seatsLoaded ||= loadSeatShapes().then((fc) => {
        if (!partsRef.current) return;
        overlays.seat.addData(fc);
        addLabels('seat', overlays.seat);
      }));

    // Union shapes are split per district; the districts in view are loaded once zoomed in.
    const unionDistricts = new Map();
    const districtBounds = {};
    distFill.eachLayer((l) => (districtBounds[l.feature.properties.id] = l.getBounds()));
    function ensureUnionDistrict(id) {
      if (!unionDistricts.has(id)) {
        const p = loadUnionShapes(id).then(
          (fc) => {
            if (!partsRef.current) return;
            overlays.union.addData(fc);
            addLabels('union', overlays.union, new Set(fc.features.map((f) => f.properties.id)));
            bringSelectedToFront();
          },
          (err) => {
            unionDistricts.delete(id);
            console.error(err);
          },
        );
        unionDistricts.set(id, p);
      }
      return unionDistricts.get(id);
    }
    function refreshUnions() {
      if (!ctx().layers.union || map.getZoom() < UNION_MIN_ZOOM) return;
      const view = map.getBounds();
      for (const [id, b] of Object.entries(districtBounds)) if (view.intersects(b)) ensureUnionDistrict(id);
    }

    map.on('zoomend', () => {
      updateLabels();
      ctx().onZoom?.(map.getZoom());
    });
    map.on('moveend', refreshUnions);
    ctx().onZoom?.(map.getZoom());

    if (mapRef) mapRef.current = map;
    partsRef.current = {
      map,
      bounds,
      divFill,
      divLines,
      distFill,
      overlays,
      bringSelectedToFront,
      updateLabels,
      rebuildLabels,
      refreshUnions,
      ensureUpazilas,
      ensureThanas,
      ensureSeats,
      ensureUnionDistrict,
    };

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
      partsRef.current = null;
      if (mapRef) mapRef.current = null;
    };
  }, [data]);

  /* Labels follow the language. */
  useEffect(() => {
    const p = partsRef.current;
    p.rebuildLabels();
    p.updateLabels();
  }, [data, lang, name]);

  /* Show / hide layers (loading upazilas, thanas and unions the first time). */
  useEffect(() => {
    const p = partsRef.current;
    const show = (layer, on) => (on ? layer.addTo(p.map) : p.map.removeLayer(layer));
    [p.divFill, p.divLines].forEach((l) => show(l, layers.div));
    show(p.distFill, layers.dist);
    show(p.overlays.upazila, layers.upz);
    show(p.overlays.thana, layers.thana);
    show(p.overlays.union, layers.union);
    show(p.overlays.seat, layers.seat);
    if (layers.seat) p.ensureSeats().then(() => partsRef.current?.updateLabels());
    if (layers.upz) p.ensureUpazilas().then(() => partsRef.current?.updateLabels());
    if (layers.thana) p.ensureThanas();
    if (layers.union) p.refreshUnions();
    p.updateLabels();
  }, [data, layers.div, layers.dist, layers.upz, layers.thana, layers.union, layers.seat]);

  /* Restyle on theme / selection / layer changes. */
  useEffect(() => {
    const p = partsRef.current;
    const c = () => ctxRef.current;
    p.divFill.setStyle((f) => divisionStyle(c(), f));
    p.divLines.setStyle(() => divisionLineStyle(c()));
    p.distFill.setStyle((f) => districtStyle(c(), f));
    for (const [kind, group] of Object.entries(p.overlays)) group.setStyle((f) => overlayStyle(kind, c(), f));
    p.bringSelectedToFront();
  }, [data, extra, theme, selected?.type, selected?.id, layers.div, layers.dist, layers.upz, layers.thana, layers.union, layers.seat]);

  /* Move the view when asked (search, list click) and, on mobile, so the area is not under the sheet. */
  useEffect(() => {
    if (!flyKey) return;
    const p = partsRef.current;
    let cancelled = false;

    async function run() {
      if (!selected) {
        if (flyKey.fly) p.map.flyToBounds(p.bounds, { padding: [20, 20], duration: 0.6 });
        return;
      }
      // Make sure the selected shape is on the map before looking for it.
      if (selected.type === 'upazila') await p.ensureUpazilas();
      if (selected.type === 'thana') await p.ensureThanas();
      if (selected.type === 'seat') await p.ensureSeats();
      if (selected.type === 'union') {
        const { unionById } = await loadUnions();
        const upz = data.upazilaById[unionById[selected.id]?.upazila_id];
        if (upz) await p.ensureUnionDistrict(upz.district_id);
      }
      if (cancelled || !partsRef.current) return;
      p.bringSelectedToFront();
      if (!flyKey.fly && !isMobile) return;

      const group = { division: p.divFill, district: p.distFill, ...p.overlays }[selected.type];
      let target = null;
      group?.eachLayer((l) => {
        if (l.feature.properties.id === selected.id) target = l;
      });
      // A seat without a known boundary: show its district instead.
      if (!target && selected.type === 'seat')
        p.distFill.eachLayer((l) => {
          if (l.feature.properties.id === data.seatById[selected.id]?.district_id) target = l;
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
      const maxZoom = { division: 8, district: 8.5, upazila: 10, thana: 10, union: 11.5, seat: 9.5 }[selected.type];
      opts.maxZoom = isMobile ? maxZoom - 0.25 : maxZoom;
      p.map.flyToBounds(target.getBounds(), opts);
    }
    run();
    return () => {
      cancelled = true;
    };
    // flyKey changes on every selection; the other values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);

  return <div id="map" ref={elRef} aria-label="Map of Bangladesh" />;
}
