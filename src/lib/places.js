/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Look up a selected place and its parents. `extra` holds the lazily loaded thana/union records.
export function getPlace(data, extra, sel) {
  if (!sel) return null;
  switch (sel.type) {
    case 'division':
      return data.divisionById[sel.id] ?? null;
    case 'district':
      return data.districtById[sel.id] ?? null;
    case 'upazila':
      return data.upazilaById[sel.id] ?? null;
    case 'thana':
      return extra.thanaById?.[sel.id] ?? null;
    case 'union':
      return extra.unionById?.[sel.id] ?? null;
    default:
      return null;
  }
}

// Parents from division down to the direct parent, as [{ type, id, place }].
export function getParents(data, extra, sel) {
  const place = getPlace(data, extra, sel);
  if (!place) return [];
  const chain = [];
  let upazila = null;
  if (sel.type === 'thana' || sel.type === 'union') upazila = data.upazilaById[place.upazila_id];
  if (sel.type === 'upazila') upazila = place;
  const districtId = sel.type === 'district' ? place.id : upazila?.district_id;
  const district = districtId ? data.districtById[districtId] : null;
  const divisionId = sel.type === 'division' ? null : (district ?? place).division_id;
  if (divisionId) chain.push({ type: 'division', id: divisionId, place: data.divisionById[divisionId] });
  if (district && sel.type !== 'district') chain.push({ type: 'district', id: district.id, place: district });
  if (upazila && sel.type !== 'upazila') chain.push({ type: 'upazila', id: upazila.id, place: upazila });
  return chain;
}

// Division id of any selected place (for colours).
export function divisionOf(data, extra, sel) {
  const chain = getParents(data, extra, sel);
  return sel?.type === 'division' ? sel.id : chain[0]?.id ?? null;
}

// i18n key for a place's kind ("Upazila", "City Corporation", "Ward" …).
export function kindKey(type, place) {
  if (type === 'upazila') return place?.type === 'city_corporation' ? 'cityCorporation' : 'upazila';
  if (type === 'union') return place?.type ?? 'union';
  return type;
}
