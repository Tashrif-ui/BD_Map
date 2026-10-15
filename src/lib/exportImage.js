/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Saves the current map view as a PNG with the owner watermark (PROJECT.md Rule 2).
// Every visible Leaflet polygon is redrawn on a canvas with the map's own projection and style
// (so shapes and labels line up exactly), then the visible name labels, a title and the
// "BD-Map · © Tashrif Alam" watermark are added.
import L from 'leaflet';

const SCALE = 2;

function haloText(ctx, text, x, y, fill, halo) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawPath(ctx, map, layer) {
  const o = layer.options;
  // _parts: the clipped rings Leaflet itself renders, in layer-point coordinates.
  const parts = layer._parts ?? [];
  if (!parts.length) return;
  ctx.beginPath();
  for (const ring of parts) {
    ring.forEach((pt, i) => {
      const p = map.layerPointToContainerPoint(pt);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (o.fill !== false) ctx.closePath();
  }
  if (o.fill !== false && o.fillOpacity > 0) {
    ctx.globalAlpha = o.fillOpacity;
    ctx.fillStyle = o.fillColor || o.color;
    ctx.fill('evenodd');
  }
  if (o.stroke !== false && o.weight > 0 && o.opacity > 0) {
    ctx.globalAlpha = o.opacity;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.weight;
    ctx.lineJoin = 'round';
    ctx.setLineDash(o.dashArray ? String(o.dashArray).split(/[ ,]+/).map(Number) : []);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

export async function exportMapImage(map, { title, fileName }) {
  await document.fonts?.ready;
  const el = map.getContainer();
  const box = el.getBoundingClientRect();
  const css = getComputedStyle(document.documentElement);
  const surface = css.getPropertyValue('--surface').trim() || '#ffffff';
  const text = css.getPropertyValue('--text').trim() || '#111111';
  const font = getComputedStyle(document.body).fontFamily;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(box.width * SCALE);
  canvas.height = Math.round(box.height * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = css.getPropertyValue('--map-bg').trim() || '#e4ebe7';
  ctx.fillRect(0, 0, box.width, box.height);

  // Polygons, bottom pane first, in the order Leaflet drew them within a pane.
  const paneZ = (layer) => Number(map.getPane(layer.options.pane)?.style.zIndex) || 400;
  const paths = [];
  map.eachLayer((layer) => {
    if (layer instanceof L.Path && layer._path) paths.push(layer);
  });
  const domOrder = (layer) => [...layer._path.parentNode.childNodes].indexOf(layer._path);
  paths.sort((a, b) => paneZ(a) - paneZ(b) || domOrder(a) - domOrder(b));
  for (const layer of paths) drawPath(ctx, map, layer);

  // Name labels currently on screen.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const lbl of el.querySelectorAll('.leaflet-tooltip.lbl')) {
    const r = lbl.getBoundingClientRect();
    if (r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;
    const s = getComputedStyle(lbl);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    ctx.font = `${s.fontWeight} ${s.fontSize} ${font}`;
    haloText(ctx, lbl.textContent, r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, text, surface);
  }

  // Title (top left) and owner watermark + date (bottom right).
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `700 18px ${font}`;
  haloText(ctx, title, 14, 12, text, surface);
  const date = new Date().toISOString().slice(0, 10);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = `700 14px ${font}`;
  haloText(ctx, 'BD-Map · © Tashrif Alam', box.width - 12, box.height - 26, text, surface);
  ctx.font = `500 11px ${font}`;
  haloText(ctx, `CC BY-NC-SA 4.0 · ${date} · Boundaries: OCHA COD-AB (BBS), geoBoundaries`, box.width - 12, box.height - 10, text, surface);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
