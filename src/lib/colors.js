/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Vivid division colours; each district gets a lighter/darker shade of its division colour
// so neighbouring districts stand apart.
export const DIVISION_COLORS = {
  dhaka: '#0fb5a0',
  chattogram: '#ff5a36',
  rajshahi: '#f5b700',
  khulna: '#3fbf4f',
  barishal: '#2f8cff',
  sylhet: '#9b51ff',
  rangpur: '#ff8c1a',
  mymensingh: '#f0408f',
};

export const DIVISION_ORDER = ['dhaka', 'chattogram', 'rajshahi', 'khulna', 'barishal', 'sylhet', 'rangpur', 'mymensingh'];

const SHADES = [0, 0.28, -0.18, 0.45, -0.32, 0.14, -0.08, 0.36, -0.25, 0.2, -0.12, 0.5, -0.38];

// amt > 0 mixes towards white, amt < 0 towards black.
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  return (
    '#' +
    [n >> 16, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function districtShade(divisionId, indexInDivision) {
  return shade(DIVISION_COLORS[divisionId], SHADES[indexInDivision % SHADES.length]);
}
