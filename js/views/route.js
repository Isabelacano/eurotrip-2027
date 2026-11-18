/*
 * PESTAÑA 1 — RUTA: mapa interactivo y cronología.
 *
 * Mapa: Leaflet (gratuito) con un mapa base vectorial propio a partir de Natural Earth (dominio público),
 * que funciona sin conexión y también al abrir index.html directamente (file://).
 * El detalle de calles de OpenStreetMap (en escala de grises) solo se ofrece cuando la app se sirve por
 * http(s): los servidores de teselas de OSM exigen la cabecera Referer y bloquean las páginas abiertas
 * como archivo local — esa era la causa del mapa "bloqueado".
 */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C } = T;
  const esc = U.esc;
  T.views = T.views || {};
  const S = store.settings;

  let map = null;
  const canUseOsm = () => location.protocol === 'http:' || location.protocol === 'https:';

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const legFor = (fromId, toId) => store.list('legs').find((l) => l.from === fromId && l.to === toId);
  const transportForLeg = (legId) => store.list('transports').find((t) => t.legId === legId);
  const modeIcon = (m) => C.icon(C.MODES, m) || '➜';
  const cityPhoto = (city) => {
    const key = store.cityPhotoKey(city);
    const img = (T.images || {})[(T.cityPhotos || {})[key]];
    return img ? img.card : '';
  };
  const cityCredit = (city) => {
    const img = (T.images || {})[(T.cityPhotos || {})[store.cityPhotoKey(city)]];
    return img ? img.file : '';
  };

  function priceText(o) {
    if (o.min === 0 && o.max === 0) return 'Incluido en el Deutschlandticket';
    if (o.min == null && o.max == null) return 'Precio a consultar';
    if (o.min === o.max || o.max == null) return '≈ ' + U.fmtEURShort(o.min) + ' p. p.';
    return '≈ ' + U.fmtEURShort(o.min) + ' – ' + U.fmtEURShort(o.max) + ' p. p.';
  }

  /* ---------- Cabecera editorial ---------- */
  function heroHtml(cities) {
    const coords = cities.map(store.cityCoords);
    let km = 0;
    for (let i = 1; i < coords.length; i++) km += haversineKm(coords[i - 1], coords[i]);
    const countries = new Set(cities.map((c) => store.cityCountry(c)).join(' / ').split(' / ').filter(Boolean));
    // Duración real calculada a partir de las fechas del itinerario (primera llegada → última salida).
    const first = cities[0];
    const last = cities[cities.length - 1];
    const nights = first && last ? U.nights(first.arrive, last.depart) : 0;
    const days = nights + 1;
    const words = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
    const nCities = cities.length <= 10 ? words[cities.length].replace('una', 'una') : String(cities.length);
    return '<section class="hero">' +
      '<div class="hero__glow" aria-hidden="true"></div>' +
      '<div class="hero__inner">' +
      '<p class="meta-row"><span>Ruta · Mapa · Cronología</span><span>(2027)</span></p>' +
      '<h2 class="hero__title">' + esc(nCities.charAt(0).toUpperCase() + nCities.slice(1)) + ' ciudades<br>en <span class="bracket">' + nights + ' noches</span></h2>' +
      '<p class="hero__lede">Cuatro perras recorriendo Europa.</p>' +
      '<p class="hero__dates">' + esc(U.fmtDateLong(first.arrive)) + ' → ' + esc(U.fmtDateLong(last.depart)) + ' · ' + days + ' días</p>' +
      // Foto del grupo (REFERENCES/FOTO.jpeg) recortada en círculo y fundida con la esfera azul.
      '<figure class="hero__photo group-photo">' +
      '<span class="group-photo__orb" aria-hidden="true"></span>' +
      '<span class="group-photo__disc"><img src="assets/foto-grupo.jpg" width="900" height="900" alt="Lenva, Isa, Pili y Pastu sentados juntos a una mesa" fetchpriority="high" decoding="async"></span>' +
      '<span class="group-photo__halo" aria-hidden="true"></span>' +
      '<figcaption>[ Lenva · Isa · Pili · Pastu ]</figcaption>' +
      '</figure>' +
      '<dl class="hero__stats">' +
      '<div><dt>Paradas</dt><dd>' + cities.length + '</dd></div>' +
      '<div><dt>Noches</dt><dd>' + nights + '</dd></div>' +
      '<div><dt>Países</dt><dd>' + countries.size + '</dd></div>' +
      '<div><dt>Km en línea recta</dt><dd>≈ ' + (Math.round(km / 50) * 50).toLocaleString('es-ES') + '</dd></div>' +
      '</dl>' +
      '<p class="hero__more">Ver la ruta ↓</p>' +
      '</div></section>';
  }

  /* ---------- Cronología ---------- */
  function choiceHtml(city) {
    if (!city.options) return '';
    const items = [{ id: 'undecided', label: 'Sin decidir' }].concat(city.options.map((o) => ({ id: o.key, label: o.name })));
    const ch = store.cityChoice(city);
    return '<div class="decision"><p class="kicker">Decisión pendiente</p>' +
      ui.segmented(items, city.choice || 'undecided', 'choose-variant', ' data-city="' + esc(city.id) + '"') +
      (ch ? '<p class="small">' + esc(ch.note) + '</p>' : city.options.map((o) => '<p class="small"><b>' + esc(o.name) + ':</b> ' + esc(o.note) + '</p>').join('')) +
      '</div>';
  }

  function stopHtml(city, i) {
    const n = U.nights(city.arrive, city.depart);
    const label = store.cityLabel(city);
    return '<article class="stop' + (i % 2 ? ' stop--alt' : '') + '" id="stop-' + esc(city.id) + '">' +
      '<div class="stop__media">' + ui.photo(cityPhoto(city), { label, kicker: store.cityCountry(city), credit: cityCredit(city) }) + '<span class="stop__num">' + String(i + 1).padStart(2, '0') + '</span></div>' +
      '<div class="stop__body">' +
      '<p class="kicker">' + esc(store.cityCountry(city)) + ' · ' + n + ' noche' + (n === 1 ? '' : 's') + '</p>' +
      '<h3 class="stop__title">' + esc(label) + '</h3>' +
      '<p class="stop__dates serif">' + esc(U.fmtDateLong(city.arrive)) + ' — ' + esc(U.fmtDateLong(city.depart)) + '</p>' +
      (city.highlights.length ? '<ul class="tags">' + city.highlights.map((h) => '<li class="tag">' + esc(h) + '</li>').join('') + '</ul>' : '') +
      choiceHtml(city) +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn--primary btn--sm" data-action="open-itinerary" data-id="' + esc(city.id) + '">Ver itinerario →</button>' +
      ui.extLink(U.mapsUrl(label + ', ' + store.cityCountry(city)), 'Ver en el mapa ↗', 'btn btn--sm') +
      '</div></div></article>';
  }

  function legHtml(from, to) {
    const leg = legFor(from.id, to.id);
    const fromName = store.cityLabel(from);
    const toName = store.cityLabel(to);
    if (!leg) return '<div class="leg"><p class="muted">Sin trayecto planificado</p></div>';
    const tr = transportForLeg(leg.id);
    const status = tr ? (tr.confirmed ? '<span class="badge badge--ok">✓ Confirmado</span>' : '<span class="badge badge--warn">' + esc(C.label(C.TICKET_STATUS, tr.status)) + '</span>') : '';
    const opts = leg.options.filter((o) => store.optionVisible(o, [from.id, to.id]));
    const tentative = (from.options && !store.cityChoice(from)) || (to.options && !store.cityChoice(to));
    return '<section class="leg' + (tentative ? ' leg--tentative' : '') + '" aria-label="Trayecto ' + esc(fromName) + ' a ' + esc(toName) + '">' +
      '<header class="leg__head">' +
      '<span class="leg__icon" aria-hidden="true">' + modeIcon(leg.mode) + '</span>' +
      '<div><p class="kicker">' + esc(U.fmtDateLong(leg.date)) + ' ' + status + '</p>' +
      '<h4 class="leg__route">' + esc(fromName) + ' <span>→</span> ' + esc(toName) + '</h4></div></header>' +
      '<ol class="options">' + opts.map((o) =>
        '<li class="option' + (o.recommended ? ' option--rec' : '') + '">' +
        '<div class="option__top"><span class="option__mode" aria-hidden="true">' + modeIcon(o.mode) + '</span>' +
        '<strong>' + esc(o.label) + '</strong>' + (o.recommended ? '<span class="pill pill--accent">Recomendado</span>' : '') + '</div>' +
        '<p class="option__meta"><span>⏱ ' + esc(o.duration) + '</span><span class="option__price">' + esc(priceText(o)) + '</span></p>' +
        (o.note ? '<p class="small">' + esc(o.note) + '</p>' : '') +
        (o.links.length ? '<p class="option__links">' + o.links.map((l) => ui.extLink(l.url, esc(l.label) + ' ↗', 'chip-link')).join('') + '</p>' : '') +
        '</li>').join('') + '</ol>' +
      (leg.notes ? '<p class="note">📝 ' + esc(leg.notes) + '</p>' : '') +
      '<div class="row-actions">' +
      '<button type="button" class="link-btn" data-action="edit-leg" data-id="' + esc(leg.id) + '">Editar fecha y notas</button>' +
      '<a class="link-btn" href="#planning" data-action="to-transport">Mis billetes →</a>' +
      '</div></section>';
  }

  function dticketHtml() {
    return '<aside class="callout callout--accent">' +
      '<p class="kicker">Alemania · desde el 1 de abril</p>' +
      '<h4 class="display-sm">Deutschlandticket</h4>' +
      '<p><b>Isa</b> ya lo tiene. <b>Pili, Pastu y Lenva</b> necesitan el de <b>abril de 2027</b>, válido desde el 1 de abril.</p>' +
      '<p class="small">Cubre solo transporte regional y local en Alemania (RE, RB, S-Bahn, U-Bahn, tranvía, bus). <b>No</b> cubre ICE, IC, EC ni rutas internacionales (p. ej. hacia Praga).</p>' +
      ui.extLink('https://www.deutschlandticket.de', 'deutschlandticket.de ↗', 'chip-link') +
      '</aside>';
  }

  function endpointsHtml(kind) {
    const groups = {};
    store.travellers().forEach((t) => { (groups[t.origin] = groups[t.origin] || []).push(t); });
    return '<div class="endpoint">' +
      '<p class="kicker">' + (kind === 'start' ? 'Llegada · mar 16 mar 2027' : 'Vuelta a casa · vie 9 abr 2027') + '</p>' +
      '<h4 class="serif endpoint__title">' + (kind === 'start' ? 'Nos encontramos en Madrid' : 'Despedida en Frankfurt') + '</h4>' +
      '<ul>' + Object.keys(groups).map((origin) =>
        '<li>' + groups[origin].map((t) => ui.avatar(t, 'sm')).join('') + ' <b>' + esc(groups[origin].map((t) => t.name).join(', ')) + '</b> ' +
        (kind === 'start' ? 'desde ' : 'de vuelta a ') + esc(origin) + '</li>').join('') + '</ul></div>';
  }

  function timelineHtml(cities) {
    let html = '<p class="disclaimer">Duraciones y precios <b>estimados</b> y orientativos por persona: no son presupuestos ni disponibilidad confirmada. Consulten siempre la web del operador.</p>' +
      endpointsHtml('start') + '<div class="timeline">';
    cities.forEach((c, i) => {
      html += stopHtml(c, i);
      if (i < cities.length - 1) {
        if (cities[i + 1].id === 'weimar-prague') html += dticketHtml();
        html += legHtml(c, cities[i + 1]);
      }
    });
    return html + '</div>' + endpointsHtml('end');
  }

  /* ---------- Mapa ---------- */
  function mapHtml(cities) {
    const osmOn = canUseOsm() && S.get('osmDetail', false);
    return '<div class="map-wrap">' +
      '<div id="map" class="map" role="region" aria-label="Mapa interactivo de la ruta"></div>' +
      '<div class="map-tools">' +
      (canUseOsm()
        ? '<label class="switch switch--inline switch--light"><input type="checkbox" data-action="osm-toggle"' + (osmOn ? ' checked' : '') + '><span class="switch__track"></span><span>Detalle de calles (OSM)</span></label>'
        : '<span class="small">Detalle de calles disponible al usar la app desde la web (GitHub Pages).</span>') +
      '</div></div>' +
      '<p class="map-credit">Mapa base: Natural Earth (dominio público)' + (osmOn ? ' · Calles © colaboradores de OpenStreetMap' : '') + ' · Leaflet</p>' +
      '<ol class="stop-list">' + cities.map((c, i) =>
        '<li><button type="button" data-action="fly" data-id="' + esc(c.id) + '">' +
        '<span class="stop-list__num">' + String(i + 1).padStart(2, '0') + '</span>' +
        ui.photo(cityPhoto(c), { cls: 'ph--thumb', thumb: true, label: store.cityLabel(c) }) +
        '<span class="stop-list__text"><span class="stop-list__name">' + esc(store.cityLabel(c)) + '</span>' +
        '<span class="small muted">' + esc(U.fmtRange(c.arrive, c.depart)) + ' · ' + U.nights(c.arrive, c.depart) + ' noches</span></span></button></li>').join('') +
      '</ol>';
  }

  function destroyMap() { if (map) { map.remove(); map = null; } }

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function initMap(cities) {
    const el = document.getElementById('map');
    if (!el) return;
    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="map-fallback"><p class="display-sm">Mapa no disponible</p><p>No se pudo cargar la librería del mapa (¿sin conexión?). La <b>Cronología</b> funciona sin conexión.</p></div>';
      return;
    }
    const osmOn = canUseOsm() && S.get('osmDetail', false);
    map = L.map(el, {
      scrollWheelZoom: false, zoomControl: true, attributionControl: false,
      minZoom: 3, maxZoom: osmOn ? 17 : 9, maxBounds: [[25, -30], [70, 45]], maxBoundsViscosity: 0.8,
    });
    const coords = cities.map(store.cityCoords);
    // Fijar la vista ANTES de añadir capas vectoriales (Leaflet necesita los límites del renderizador).
    map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    const ink = cssVar('--map-route', '#4f5bff');
    const land = cssVar('--map-land', '#1c1c22');
    const border = cssVar('--map-border', '#3a3a43');

    if (T.europe) {
      L.geoJSON(T.europe, { interactive: false, style: { color: border, weight: 0.8, fillColor: land, fillOpacity: 1 } }).addTo(map);
    }
    if (osmOn) {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'tiles-mono' }).addTo(map);
    }
    L.control.attribution({ prefix: false }).addAttribution(osmOn ? '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Natural Earth' : 'Natural Earth').addTo(map);

    for (let i = 1; i < cities.length; i++) {
      const tentative = (cities[i].options && !store.cityChoice(cities[i])) || (cities[i - 1].options && !store.cityChoice(cities[i - 1]));
      L.polyline([coords[i - 1], coords[i]], { color: ink, weight: 3, opacity: 0.9, dashArray: tentative ? '6 8' : null }).addTo(map);
    }

    cities.forEach((c, i) => {
      const label = store.cityLabel(c);
      const n = U.nights(c.arrive, c.depart);
      const popup = '<div class="popup">' + ui.photo(cityPhoto(c), { cls: 'ph--popup', sizes: '240px', label }) +
        '<p class="kicker">' + String(i + 1).padStart(2, '0') + ' · ' + esc(store.cityCountry(c)) + '</p>' +
        '<p class="popup__title">' + esc(label) + '</p>' +
        '<p class="small">' + esc(U.fmtDateLong(c.arrive)) + ' — ' + esc(U.fmtDateLong(c.depart)) + ' · ' + n + ' noches</p>' +
        (c.highlights.length ? '<p class="small muted">' + esc(c.highlights.join(' · ')) + '</p>' : '') +
        '<a href="#itinerary" class="link-btn" data-action="open-itinerary" data-id="' + esc(c.id) + '">Ver itinerario →</a></div>';
      const icon = L.divIcon({ className: 'map-pin', html: '<span>' + (i + 1) + '</span>', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] });
      const m = L.marker(coords[i], { icon, title: label, keyboard: true }).addTo(map).bindPopup(popup, { maxWidth: 240, minWidth: 200 });
      m._cityId = c.id;
      if (!osmOn) L.marker(coords[i], { icon: L.divIcon({ className: 'map-label', html: '<span>' + esc(label) + '</span>', iconSize: [0, 0] }), interactive: false }).addTo(map);

      if (c.options && !store.cityChoice(c)) {
        c.options.slice(1).forEach((o) => {
          const alt = [o.lat, o.lon];
          const altIcon = L.divIcon({ className: 'map-pin map-pin--alt', html: '<span>' + (i + 1) + '?</span>', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] });
          L.marker(alt, { icon: altIcon, title: o.name }).addTo(map)
            .bindPopup('<div class="popup"><p class="kicker">Alternativa</p><p class="popup__title">' + esc(o.name) + '</p><p class="small">' + esc(o.note) + '</p></div>', { maxWidth: 240 });
          if (!osmOn) L.marker(alt, { icon: L.divIcon({ className: 'map-label map-label--alt', html: '<span>' + esc(o.name) + '?</span>', iconSize: [0, 0] }), interactive: false }).addTo(map);
          if (i > 0) L.polyline([coords[i - 1], alt], { color: ink, weight: 2, opacity: 0.45, dashArray: '3 7' }).addTo(map);
          if (i < cities.length - 1) L.polyline([alt, coords[i + 1]], { color: ink, weight: 2, opacity: 0.45, dashArray: '3 7' }).addTo(map);
        });
      }
    });

    setTimeout(() => map && map.invalidateSize(), 80);
  }

  function editLeg(id) {
    const leg = store.get('legs', id);
    if (!leg) return;
    ui.openForm({
      title: store.cityLabelById(leg.from) + ' → ' + store.cityLabelById(leg.to),
      fields: [
        { name: 'mode', label: 'Transporte previsto', type: 'select', half: true, options: C.MODES.map((m) => ({ value: m.id, label: m.icon + ' ' + m.label })) },
        { name: 'date', label: 'Fecha', type: 'date', half: true },
        { name: 'notes', label: 'Notas', type: 'textarea', rows: 4 },
      ],
      values: leg,
      intro: 'Este es el trayecto previsto. Registren la reserva real (horarios, precio, número de reserva) en <b>Planificación → Transporte</b>.',
      onSubmit(v) { store.upsert('legs', Object.assign({ id }, v)); ui.toast('Guardado'); },
    });
  }

  T.views.route = {
    render(el) {
      destroyMap();
      const mode = S.get('routeMode', 'map');
      const cities = store.cities();
      el.innerHTML = heroHtml(cities) +
        '<section class="page">' +
        '<div class="page__bar">' + ui.segmented([{ id: 'map', label: 'Mapa' }, { id: 'timeline', label: 'Cronología' }], mode, 'route-mode') + '</div>' +
        (mode === 'map' ? mapHtml(cities) : timelineHtml(cities)) +
        '</section>';
      if (mode === 'map') initMap(cities);
    },
    leave: destroyMap,
    onClick(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const id = a.dataset.id;
      switch (a.dataset.action) {
        case 'route-mode': S.set('routeMode', id); T.app.render(); break;
        case 'choose-variant':
          store.setCityChoice(a.dataset.city, id);
          ui.toast(id === 'undecided' ? 'Marcado como sin decidir' : 'Elegido: ' + store.cityLabelById(a.dataset.city));
          break;
        case 'open-itinerary':
          e.preventDefault();
          S.set('itinCity', id);
          T.app.go('itinerary');
          break;
        case 'to-transport': S.set('planTab', 'tr'); break;
        case 'edit-leg': editLeg(id); break;
        case 'fly': {
          if (!map) return;
          const c = store.get('cities', id);
          map.flyTo(store.cityCoords(c), Math.min(map.getMaxZoom(), 8), { duration: 0.8 });
          map.eachLayer((l) => { if (l._cityId === id) setTimeout(() => l.openPopup(), 850); });
          document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    },
    onChange(e) {
      if (e.target.matches('[data-action="osm-toggle"]')) { S.set('osmDetail', e.target.checked); T.app.render(); }
    },
  };
})(typeof self !== 'undefined' ? self : this);
