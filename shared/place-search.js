import {PLACES} from './settings.js';

const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const letters = text => normalize(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
const distance = (a, b) => {
  const r = Math.PI / 180, dlat = (a.lat - b.lat) * r, dlon = (a.lon - b.lon) * r;
  return Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
};
export function placeCode(place) {
  const known = PLACES.find(p => normalize(p.name) === normalize(place.name) && p.tz === place.tz && distance(p, place) < .00001);
  if (known) return known.label;
  const words = normalize(place.name).split(/[\s-]+/).filter(Boolean);
  const initials = words.map(letters).map(w => w[0] || '').join('');
  const code = words.length >= 3 ? initials : words.length === 2 ? initials + (letters(words[1])[1] || letters(words[0])[1] || '') : letters(place.name);
  return (code || letters(place.tz.split('/').pop()) || 'CITY').slice(0, 3);
}
export function localPlaces(query) {
  const q = normalize(query);
  return PLACES.filter(p => !q || normalize(p.name).includes(q) || normalize(p.label).startsWith(q)).slice(0, 8);
}
export function searchResults(payload, {zoneExists = () => true, near = null} = {}) {
  const seen = new Set();
  const results = (Array.isArray(payload?.results) ? payload.results : []).flatMap(r => {
    if (!r || typeof r.name !== 'string' || !r.name.trim() || typeof r.timezone !== 'string' || !zoneExists(r.timezone) || !Number.isFinite(r.latitude) || Math.abs(r.latitude) > 90 || !Number.isFinite(r.longitude) || Math.abs(r.longitude) > 180) return [];
    const p = {name: r.name.slice(0, 60), tz: r.timezone, lat: r.latitude, lon: r.longitude,
      region: [r.admin1, r.country].filter(v => typeof v === 'string' && v !== r.name).join(', ')};
    const key = `${p.name}/${p.tz}/${p.lat}/${p.lon}`;
    if (seen.has(key)) return []; seen.add(key);
    return [{...p, label: placeCode(p)}];
  });
  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lon)) results.sort((a, b) => distance(a, near) - distance(b, near));
  return results.slice(0, 8);
}
export function citySearch(root, {onSelect, zoneExists, near, label = 'Search for a city', fetcher = globalThis.fetch?.bind(globalThis)}) {
  const id = 'city-results-' + (++citySearch.count);
  root.classList.add('city-search');
  root.innerHTML = `<label class="field"><span></span><input type="search" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="City or place, e.g. Norfolk, VA" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}"></label><div class="city-results" role="listbox" id="${id}" hidden></div><p class="micro search-status" role="status" aria-live="polite">Search worldwide, or choose a saved city below.</p>`;
  root.querySelector('label span').textContent = label;
  const input = root.querySelector('input'), list = root.querySelector('[role=listbox]'), status = root.querySelector('[role=status]');
  input.setAttribute('aria-label', label); list.setAttribute('aria-label', 'Matching cities');
  let timer, controller, generation = 0, choices = [], active = -1, destroyed = false;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const cancel = () => { clearTimeout(timer); controller?.abort(); generation++; };
  const pick = i => { const place = choices[i]; if (!place) return; cancel(); close(); input.value = ''; onSelect(place); status.textContent = `${place.name} selected. Coordinates and time zone filled in. You can edit its label.`; };
  function show(items, message) {
    choices = items; active = -1; list.replaceChildren(); input.removeAttribute('aria-activedescendant');
    items.forEach((p, i) => {
      const option = document.createElement('div'); option.id = id + '-' + i; option.role = 'option'; option.setAttribute('aria-selected', 'false');
      const title = document.createElement('strong'), code = document.createElement('span'), detail = document.createElement('small');
      title.textContent = p.name; code.textContent = p.label; code.className = 'city-code'; detail.textContent = p.region || p.tz.replace(/_/g, ' ');
      option.append(title, code, detail); option.onmousedown = e => e.preventDefault(); option.onclick = () => pick(i); list.append(option);
    });
    list.hidden = !items.length; input.setAttribute('aria-expanded', String(!!items.length)); status.textContent = message;
  }
  input.oninput = () => {
    cancel(); const token = generation, q = input.value.trim(), local = localPlaces(q);
    show(local, q.length < 3 ? 'Type at least 3 letters for worldwide search.' : 'Searching cities…');
    if (q.length < 3) return;
    timer = setTimeout(async () => {
      const requestController = typeof AbortController === 'function' ? new AbortController() : null;
      controller = requestController;
      const timeout = setTimeout(() => requestController?.abort(), 8000);
      try {
        if (!fetcher) throw new Error('Search unavailable');
        const response = await fetcher('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q.slice(0, 100)) + '&count=12&language=en&format=json', {signal: requestController?.signal});
        if (!response.ok) throw new Error('Search unavailable');
        const payload = await response.json(); if (destroyed || token !== generation) return;
        const results = searchResults(payload, {zoneExists, near: typeof near === 'function' ? near() : near});
        show(results.length ? results : local, results.length ? 'Choose the city and region you mean.' : local.length ? 'Saved cities shown. No additional matches.' : 'No cities found. Try a nearby town or add a country after a comma.');
      } catch { if (!destroyed && token === generation) show(local, 'City search is unavailable. Saved cities and manual coordinates still work.'); }
      finally { clearTimeout(timeout); }
    }, 350);
  };
  input.onblur = () => { cancel(); close(); };
  input.onkeydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); close(); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) pick(active); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(e.key) || !choices.length) return;
    e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : choices.length - 1)) % choices.length;
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    [...list.children].forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', list.children[active].id); list.children[active].scrollIntoView({block: 'nearest'});
  };
  const onOutside = e => { if (!root.contains(e.target)) { cancel(); close(); } };
  document.addEventListener('pointerdown', onOutside);
  return {destroy() { destroyed = true; cancel(); document.removeEventListener('pointerdown', onOutside); }};
}
citySearch.count = 0;
