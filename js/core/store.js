/*
 * Capa de datos: el ÚNICO lugar que lee/escribe localStorage.
 *
 * Documento guardado (y formato del archivo exportado):
 * {
 *   app: 'eurotrip-2027', schemaVersion: 3, updatedAt,
 *   tombstones: { idRegistro: fechaBorrado },   // para que "combinar" propague los borrados
 *   travellers, cities, legs, activities, expenses, accommodations, transports, checklist, notes
 * }
 * Las fotos de perfil y de actividades se guardan comprimidas DENTRO de este documento, así viajan
 * con Exportar/Importar igual que los gastos y las demás viajeras/os las ven al combinar.
 * Para pasar a una base de datos compartida en el futuro basta con sustituir load()/persist().
 */
(function (root) {
  const T = (root.Trip = root.Trip || {});
  const U = T.utils;

  const DATA_KEY = 'eurotrip2027.data';
  const SETTINGS_KEY = 'eurotrip2027.settings';
  const APP_ID = 'eurotrip-2027';
  const SCHEMA_VERSION = 3;
  const COLLECTIONS = ['travellers', 'cities', 'legs', 'activities', 'expenses', 'accommodations', 'transports', 'checklist', 'notes'];

  const C = (T.constants = {
    ACTIVITY_CATEGORIES: [
      { id: 'architecture', label: 'Arquitectura y edificios emblemáticos', short: 'Arquitectura', icon: '🏛️' },
      { id: 'museums', label: 'Museos y exposiciones', short: 'Museos', icon: '🖼️' },
      { id: 'culture', label: 'Arte y cultura', short: 'Arte y cultura', icon: '🎭' },
      { id: 'cafes', label: 'Cafeterías y cafés especiales', short: 'Cafés', icon: '☕' },
      { id: 'restaurants', label: 'Restaurantes', short: 'Restaurantes', icon: '🍝' },
      { id: 'budget', label: 'Restaurantes económicos y comida local', short: 'Comida económica', icon: '🥪' },
      { id: 'nightlife', label: 'Bares y vida nocturna', short: 'Bares y noche', icon: '🍸' },
      { id: 'entertainment', label: 'Entretenimiento', short: 'Entretenimiento', icon: '🎶' },
      { id: 'outdoors', label: 'Parques y espacios públicos', short: 'Parques', icon: '🌳' },
      { id: 'markets', label: 'Mercados y lugares alternativos', short: 'Mercados', icon: '🧺' },
      { id: 'daytrips', label: 'Excursiones y destinos cercanos', short: 'Excursiones', icon: '🚆' },
    ],
    PRICE_FILTERS: [
      { id: 'all', label: 'Todos los precios' },
      { id: 'free', label: 'Gratis' },
      { id: 'budget', label: 'Económico (≤ 15 €)' },
      { id: 'paid', label: 'De pago (> 15 €)' },
    ],
    EXPENSE_CATEGORIES: [
      { id: 'food', label: 'Comida y bebida', icon: '🍽️' },
      { id: 'accommodation', label: 'Alojamiento', icon: '🛏️' },
      { id: 'transport', label: 'Transporte', icon: '🚆' },
      { id: 'activities', label: 'Actividades y entradas', icon: '🎟️' },
      { id: 'groceries', label: 'Supermercado', icon: '🛒' },
      { id: 'shopping', label: 'Compras', icon: '🛍️' },
      { id: 'other', label: 'Otros', icon: '📦' },
      { id: 'settlement', label: 'Reembolso', icon: '🤝' },
    ],
    MODES: [
      { id: 'flight', label: 'Avión', icon: '✈️' },
      { id: 'train', label: 'Tren', icon: '🚆' },
      { id: 'bus', label: 'Autobús', icon: '🚌' },
      { id: 'car', label: 'Coche', icon: '🚗' },
      { id: 'ferry', label: 'Ferry', icon: '⛴️' },
      { id: 'other', label: 'Otro', icon: '🧭' },
    ],
    ACC_TYPES: [
      { id: 'hotel', label: 'Hotel' }, { id: 'hostel', label: 'Hostal / albergue' }, { id: 'airbnb', label: 'Airbnb / apartamento' },
      { id: 'home', label: 'Casa de amigos' }, { id: 'other', label: 'Otro' },
    ],
    PAYMENT: [
      { id: 'unpaid', label: 'Sin pagar' }, { id: 'deposit', label: 'Señal pagada' }, { id: 'paid', label: 'Pagado' },
      { id: 'pay-at-hotel', label: 'Pago a la llegada' }, { id: 'free', label: 'Gratis' },
    ],
    TICKET_STATUS: [
      { id: 'to-book', label: 'Por reservar' }, { id: 'booked', label: 'Reservado' }, { id: 'ticket', label: 'Billete recibido' },
      { id: 'cancelled', label: 'Cancelado' },
    ],
    CHECK_LISTS: [
      { id: 'documents', label: 'Documentos importantes', icon: '📄' },
      { id: 'packing', label: 'Equipaje general', icon: '🎒' },
      { id: 'before', label: 'Antes del viaje', icon: '🗓️' },
      { id: 'reservations', label: 'Pendientes de reserva', icon: '📌' },
      { id: 'personal', label: 'Equipaje personal', icon: '👤' },
      { id: 'buy', label: 'Cosas por comprar', icon: '🛒' },
      { id: 'reminders', label: 'Recordatorios importantes', icon: '⏰' },
    ],
    AVATARS: ['✈️', '🏛️', '📐', '☕', '🍝', '🎒', '📷', '🎨', '🌍', '🍷', '🚲', '🌻'],
    TRIP_START: '2027-03-16',
    TRIP_END: '2027-04-09',
  });

  const ids = (list) => list.map((x) => x.id);
  const label = (list, id) => (list.find((x) => x.id === id) || {}).label || id || '';
  C.label = label;
  C.icon = (list, id) => (list.find((x) => x.id === id) || {}).icon || '';

  /* ---------------- Normalización ---------------- */
  const str = (v) => (v == null ? '' : String(v));
  const bool = (v) => v === true;
  const intOrNull = (v) => (Number.isInteger(v) ? v : null);
  const dateOr = (v) => (U.isIsoDate(v) ? v : '');
  const oneOf = (v, list, dflt) => (ids(list).includes(v) ? v : dflt);
  /** Imagen: URL http(s) o data:image comprimida (subida desde el dispositivo). */
  const imageOr = (v) => {
    const s = str(v);
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 400000) return s;
    return U.safeUrl(s);
  };
  const base = (r) => ({ id: str(r.id), createdAt: str(r.createdAt) || U.nowIso(), updatedAt: str(r.updatedAt) || U.nowIso() });
  const numOrNull = (v) => (Number.isFinite(v) ? v : null);

  const NORMALIZE = {
    travellers: (r) => Object.assign(base(r), {
      name: str(r.name).slice(0, 30), origin: str(r.origin), fromCountry: str(r.fromCountry), color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : '#555555',
      photo: imageOr(r.photo), avatar: str(r.avatar).slice(0, 8),
    }),
    cities: (r) => Object.assign(base(r), {
      name: str(r.name), country: str(r.country), lat: Number(r.lat) || 0, lon: Number(r.lon) || 0,
      arrive: dateOr(r.arrive), depart: dateOr(r.depart), overview: str(r.overview), notes: str(r.notes),
      highlights: Array.isArray(r.highlights) ? r.highlights.map(str) : [], order: Number.isFinite(r.order) ? r.order : 99,
      choice: r.options ? str(r.choice || 'undecided') : undefined,
      options: Array.isArray(r.options) ? r.options.map((o) => ({ key: str(o.key), name: str(o.name), country: str(o.country), lat: Number(o.lat) || 0, lon: Number(o.lon) || 0, note: str(o.note) })) : undefined,
    }),
    legs: (r) => Object.assign(base(r), {
      from: str(r.from), to: str(r.to), date: dateOr(r.date), mode: oneOf(r.mode, C.MODES, 'other'), notes: str(r.notes),
      options: Array.isArray(r.options) ? r.options.map((o) => ({
        mode: oneOf(o.mode, C.MODES, 'other'), label: str(o.label), duration: str(o.duration), min: numOrNull(o.min), max: numOrNull(o.max),
        note: str(o.note), recommended: bool(o.recommended), variant: str(o.variant),
        links: Array.isArray(o.links) ? o.links.map((l) => ({ label: str(l.label), url: U.safeUrl(l.url) })).filter((l) => l.url) : [],
      })) : [],
    }),
    activities: (r) => {
      const likes = {};
      if (r.likes && typeof r.likes === 'object') {
        Object.keys(r.likes).forEach((k) => {
          const l = r.likes[k];
          if (l && typeof l === 'object') likes[k] = { liked: bool(l.liked), at: str(l.at) };
        });
      }
      const comments = {};
      if (r.comments && typeof r.comments === 'object') {
        Object.keys(r.comments).forEach((k) => {
          const c = r.comments[k];
          if (c && typeof c === 'object') comments[k] = { by: str(c.by), text: str(c.text).slice(0, 1000), at: str(c.at) };
        });
      }
      return Object.assign(base(r), {
        cityId: str(r.cityId), category: oneOf(r.category, C.ACTIVITY_CATEGORIES, 'culture'), name: str(r.name),
        siteName: str(r.siteName), addedBy: str(r.addedBy), recId: str(r.recId), comments,
        description: str(r.description), priceCents: intOrNull(r.priceCents), address: str(r.address),
        website: str(r.website), youtube: str(r.youtube), notes: str(r.notes), date: dateOr(r.date), variant: str(r.variant),
        planned: bool(r.planned), image: imageOr(r.image), imageCredit: U.safeUrl(r.imageCredit), likes,
      });
    },
    expenses: (r) => Object.assign(base(r), {
      description: str(r.description), amountCents: intOrNull(r.amountCents), date: dateOr(r.date), cityId: str(r.cityId),
      paidBy: str(r.paidBy), participants: Array.isArray(r.participants) ? Array.from(new Set(r.participants.map(str))) : [],
      category: oneOf(r.category, C.EXPENSE_CATEGORIES, 'other'), notes: str(r.notes),
    }),
    accommodations: (r) => Object.assign(base(r), {
      name: str(r.name), type: oneOf(r.type, C.ACC_TYPES, 'other'), cityId: str(r.cityId), checkIn: dateOr(r.checkIn), checkOut: dateOr(r.checkOut),
      totalCents: intOrNull(r.totalCents), people: Number.isInteger(r.people) && r.people > 0 ? r.people : 4, link: str(r.link),
      address: str(r.address), confirmation: str(r.confirmation), payment: oneOf(r.payment, C.PAYMENT, 'unpaid'),
      confirmed: bool(r.confirmed), notes: str(r.notes), variant: str(r.variant),
    }),
    transports: (r) => Object.assign(base(r), {
      type: oneOf(r.type, C.MODES, 'other'), from: str(r.from), to: str(r.to), date: dateOr(r.date), time: str(r.time),
      arriveDate: dateOr(r.arriveDate), arriveTime: str(r.arriveTime), company: str(r.company), priceCents: intOrNull(r.priceCents),
      priceEstimated: r.priceEstimated === undefined ? true : bool(r.priceEstimated),
      link: str(r.link), ticketLink: str(r.ticketLink), reference: str(r.reference), status: oneOf(r.status, C.TICKET_STATUS, 'to-book'), confirmed: bool(r.confirmed),
      travellers: Array.isArray(r.travellers) ? r.travellers.map(str) : [], legId: str(r.legId), notes: str(r.notes),
    }),
    checklist: (r) => Object.assign(base(r), { list: oneOf(r.list, C.CHECK_LISTS, 'reminders'), owner: str(r.owner), text: str(r.text), done: bool(r.done) }),
    notes: (r) => Object.assign(base(r), { title: str(r.title), body: str(r.body), url: str(r.url) }),
  };

  function seedCollections(v2) {
    const s = v2 ? T.seed.buildV2() : T.seed.build();
    const out = {};
    COLLECTIONS.forEach((col) => { out[col] = (s[col] || []).map(NORMALIZE[col]); });
    return out;
  }

  /*
   * Migración v1 → v2 (interfaz en español + nuevas recomendaciones).
   * - Conserva TODOS los gastos y todo lo que el grupo haya creado o editado.
   * - Los datos iniciales sin modificar se sustituyen por la versión en español.
   * - Las actividades iniciales conservan likes, notas, vídeo, fecha y plan.
   */
  function upgrade(doc) {
    const seed = seedCollections(true);
    const oldTs = T.seed.OLD_TS;
    const now = U.nowIso();
    COLLECTIONS.forEach((col) => {
      if (col === 'expenses') return;
      const seedMap = new Map(seed[col].map((r) => [r.id, r]));
      const seen = new Set();
      const result = [];
      doc[col].forEach((rec) => {
        const s = seedMap.get(rec.id);
        const untouched = rec.updatedAt <= oldTs;
        if (s) {
          seen.add(rec.id);
          let merged;
          if (col === 'activities') merged = Object.assign({}, s, { likes: rec.likes, notes: rec.notes, youtube: rec.youtube, date: rec.date || s.date, planned: rec.planned });
          else if (col === 'cities') {
            merged = Object.assign({}, s, { arrive: rec.arrive || s.arrive, depart: rec.depart || s.depart, notes: rec.notes, choice: rec.choice || s.choice });
            const ch = (s.options || []).find((o) => o.key === merged.choice);
            if (ch) Object.assign(merged, { name: ch.name, country: ch.country, lat: ch.lat, lon: ch.lon });
          } else if (col === 'legs') merged = untouched ? s : Object.assign({}, s, { date: rec.date || s.date, mode: rec.mode, notes: rec.notes });
          else if (col === 'travellers') merged = Object.assign({}, s, { name: rec.name || s.name, color: rec.color || s.color, photo: rec.photo, avatar: rec.avatar });
          else merged = untouched ? s : rec;
          result.push(merged);
          return;
        }
        // Registro inicial antiguo (en inglés) que ya no existe y nadie modificó: se elimina.
        if (untouched && rec.createdAt <= oldTs) { doc.tombstones[rec.id] = now; return; }
        result.push(rec);
      });
      seed[col].forEach((s) => { if (!seen.has(s.id) && !doc.tombstones[s.id]) result.push(s); });
      doc[col] = result;
    });
    return doc;
  }

  /*
   * Migración v2 → v3: el itinerario deja de rellenarse con recomendaciones.
   * - Las recomendaciones iniciales que nadie tocó se retiran del itinerario (siguen en "Recomendaciones").
   * - Las que alguien marcó como favorita, añadió al plan, anotó o editó se QUEDAN en el itinerario.
   * - Las actividades creadas por el grupo se conservan siempre.
   */
  function upgradeV3(doc) {
    const recs = new Map(T.seed.recommendations().map((r) => [r.id, r]));
    const now = U.nowIso();
    doc.activities = doc.activities.filter((a) => {
      const rec = recs.get(a.id);
      if (!rec) return true;
      const liked = Object.keys(a.likes).some((k) => a.likes[k].liked);
      const edited = a.name !== rec.name || a.description !== rec.description || a.category !== rec.category || a.priceCents !== (rec.priceCents == null ? null : rec.priceCents);
      if (liked || a.planned || a.notes || a.youtube || edited) {
        a.recId = a.id;
        if (!a.addedBy) { const liker = Object.keys(a.likes).find((k) => a.likes[k].liked); a.addedBy = liker || ''; }
        return true;
      }
      doc.tombstones[a.id] = now;
      return false;
    });
    return doc;
  }

  function normalizeDoc(raw) {
    const out = { app: APP_ID, schemaVersion: SCHEMA_VERSION, updatedAt: str(raw.updatedAt) || U.nowIso(), tombstones: {} };
    if (raw.tombstones && typeof raw.tombstones === 'object') {
      Object.keys(raw.tombstones).forEach((k) => { if (typeof raw.tombstones[k] === 'string') out.tombstones[k] = raw.tombstones[k]; });
    }
    COLLECTIONS.forEach((col) => {
      out[col] = (Array.isArray(raw[col]) ? raw[col] : []).filter((r) => r && typeof r === 'object' && r.id).map(NORMALIZE[col]);
    });
    if ((raw.schemaVersion || 1) < 2) upgrade(out);
    if ((raw.schemaVersion || 1) < 3) upgradeV3(out);
    resetUntouchedTravellers(out);
    return out;
  }

  /*
   * Antes, los perfiles iniciales se guardaban con la hora de la primera apertura en cada teléfono.
   * Un perfil sin tocar podía así parecer "más nuevo" que la foto que otra persona subió antes
   * y borrarla al combinar. Los perfiles que siguen exactamente como al principio vuelven a la
   * marca de tiempo fija de los datos iniciales, de modo que cualquier cambio real siempre gana.
   */
  function resetUntouchedTravellers(d) {
    const seedTs = T.seed.TS;
    const seed = new Map(T.seed.build().travellers.map((t) => [t.id, t]));
    d.travellers.forEach((t) => {
      const s = seed.get(t.id);
      if (s && !t.photo && !t.avatar && t.name === s.name && t.updatedAt > seedTs) {
        t.updatedAt = seedTs;
        t.createdAt = seedTs;
      }
    });
  }

  function freshDoc() {
    return Object.assign({ app: APP_ID, schemaVersion: SCHEMA_VERSION, updatedAt: T.seed.TS, tombstones: {} }, seedCollections());
  }

  /* ---------------- Validación (antes de importar) ---------------- */
  function validate(obj) {
    const errors = [];
    const warnings = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['El archivo no contiene datos de viaje.'], warnings };
    if (obj.app !== APP_ID) errors.push('Este archivo no se exportó desde EuroTrip 2027.');
    if (typeof obj.schemaVersion !== 'number') errors.push('Falta la versión del formato de datos.');
    else if (obj.schemaVersion > SCHEMA_VERSION) errors.push('El archivo viene de una versión más nueva de la app (v' + obj.schemaVersion + '). Actualicen la app primero.');

    COLLECTIONS.forEach((col) => {
      if (obj[col] === undefined) { warnings.push('Falta la sección "' + col + '"; quedará vacía.'); return; }
      if (!Array.isArray(obj[col])) { errors.push('"' + col + '" debe ser una lista.'); return; }
      const seen = new Set();
      obj[col].forEach((r, i) => {
        if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) { errors.push(col + ' n.º ' + (i + 1) + ' no tiene id.'); return; }
        if (seen.has(r.id)) errors.push(col + ': id duplicado "' + r.id + '".');
        seen.add(r.id);
      });
    });
    if (errors.length) return { ok: false, errors, warnings };

    const travellerIds = (obj.travellers || []).map((t) => t.id);
    if (!travellerIds.length) errors.push('El archivo no tiene viajeras/os.');
    (obj.expenses || []).forEach((e, i) => {
      const name = '"' + (e.description || 'gasto n.º ' + (i + 1)) + '"';
      if (!Number.isInteger(e.amountCents) || e.amountCents <= 0) errors.push('El gasto ' + name + ' tiene un importe no válido.');
      if (!travellerIds.includes(e.paidBy)) errors.push('El gasto ' + name + ' tiene un pagador desconocido.');
      if (!Array.isArray(e.participants) || !e.participants.length) errors.push('El gasto ' + name + ' no tiene participantes.');
      else if (e.participants.some((p) => !travellerIds.includes(p))) errors.push('El gasto ' + name + ' tiene un participante desconocido.');
    });
    if (obj.schemaVersion === 1) warnings.push('Archivo de la versión anterior (en inglés): se actualizará automáticamente al combinarlo.');
    if (obj.schemaVersion === 2) warnings.push('Archivo de la versión anterior: las recomendaciones que nadie marcó pasarán a la sección "Recomendaciones".');

    const names = { cities: 'ciudades', legs: 'trayectos', activities: 'actividades', expenses: 'gastos', accommodations: 'alojamientos', transports: 'transportes', checklist: 'tareas', notes: 'notas' };
    const summary = COLLECTIONS.filter((c) => c !== 'travellers').map((c) => (obj[c] || []).length + ' ' + names[c]).join(', ');
    return { ok: errors.length === 0, errors, warnings, summary };
  }

  /* ---------------- Combinar (fusionar exportaciones de dos teléfonos) ---------------- */
  const newer = (a, b) => (str(a.updatedAt) >= str(b.updatedAt) ? a : b);

  function mergeDocs(local, incoming) {
    const out = { app: APP_ID, schemaVersion: SCHEMA_VERSION, updatedAt: U.nowIso(), tombstones: Object.assign({}, local.tombstones) };
    Object.keys(incoming.tombstones).forEach((k) => {
      if (!out.tombstones[k] || incoming.tombstones[k] > out.tombstones[k]) out.tombstones[k] = incoming.tombstones[k];
    });
    const stats = { added: 0, updated: 0, removed: 0 };
    COLLECTIONS.forEach((col) => {
      const map = new Map(local[col].map((r) => [r.id, r]));
      incoming[col].forEach((r) => {
        const cur = map.get(r.id);
        if (!cur) { map.set(r.id, r); stats.added++; return; }
        let winner = newer(cur, r);
        if (winner !== cur && JSON.stringify(winner) !== JSON.stringify(cur)) stats.updated++;
        if (col === 'activities') {
          const likes = Object.assign({}, cur.likes);
          Object.keys(r.likes || {}).forEach((k) => {
            if (!likes[k] || str(r.likes[k].at) > str(likes[k].at)) likes[k] = r.likes[k];
          });
          const comments = Object.assign({}, cur.comments);
          Object.keys(r.comments || {}).forEach((k) => {
            if (!comments[k] || str(r.comments[k].at) > str(comments[k].at)) comments[k] = r.comments[k];
          });
          winner = Object.assign({}, winner, { likes, comments });
        }
        map.set(r.id, winner);
      });
      out[col] = Array.from(map.values()).filter((r) => {
        const t = out.tombstones[r.id];
        const dead = t && t >= str(r.updatedAt);
        if (dead && local[col].some((x) => x.id === r.id)) stats.removed++;
        return !dead;
      });
    });
    return { doc: out, stats };
  }

  /* ---------------- Persistencia ---------------- */
  let doc = null;
  let lastSaveError = null;
  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(doc));
      lastSaveError = null;
    } catch (e) {
      lastSaveError = e;
      if (T.ui) T.ui.toast('⚠️ No se pudo guardar en este dispositivo (almacenamiento lleno o bloqueado). ¡Exporten los datos!', 6000);
    }
  }

  function notify() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }

  function commit() {
    doc.updatedAt = U.nowIso();
    persist();
    notify();
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(DATA_KEY); } catch (e) { /* almacenamiento bloqueado: en memoria */ }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const v = validate(parsed);
        if (v.ok) {
          const wasOld = (parsed.schemaVersion || 1) < SCHEMA_VERSION;
          if (wasOld) { try { localStorage.setItem(DATA_KEY + '.backup-v' + parsed.schemaVersion, raw); } catch (e) { /* ignorar */ } }
          doc = normalizeDoc(parsed);
          if (wasOld) persist();
          return { restored: true, upgraded: wasOld };
        }
        try { localStorage.setItem(DATA_KEY + '.corrupt-' + Date.now(), raw); } catch (e) { /* ignorar */ }
        console.warn('Datos guardados no válidos; se empieza de cero:', v.errors);
      } catch (e) { console.warn('Datos guardados ilegibles; se empieza de cero', e); }
    }
    doc = freshDoc();
    persist();
    return { restored: false };
  }

  /* ---------------- Ajustes (por dispositivo, nunca se exportan) ---------------- */
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) { settings = {}; }
  const Settings = {
    get: (k, dflt) => (settings[k] === undefined ? dflt : settings[k]),
    set(k, v) {
      settings[k] = v;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignorar */ }
    },
  };

  /* ---------------- API pública ---------------- */
  const store = {
    COLLECTIONS, SCHEMA_VERSION, settings: Settings,
    init: load,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get doc() { return doc; },
    lastSaveError: () => lastSaveError,

    list(col) { return doc[col]; },
    get(col, id) { return doc[col].find((r) => r.id === id) || null; },

    upsert(col, record) {
      const t = U.nowIso();
      const existing = record.id ? store.get(col, record.id) : null;
      const rec = NORMALIZE[col](Object.assign({}, existing || {}, record, {
        id: record.id || U.uid(col.slice(0, 3)),
        createdAt: (existing && existing.createdAt) || t,
        updatedAt: t,
      }));
      if (existing) doc[col] = doc[col].map((r) => (r.id === rec.id ? rec : r));
      else doc[col].push(rec);
      delete doc.tombstones[rec.id];
      commit();
      return rec;
    },

    remove(col, id) {
      const before = doc[col].length;
      doc[col] = doc[col].filter((r) => r.id !== id);
      if (doc[col].length !== before) {
        doc.tombstones[id] = U.nowIso();
        commit();
      }
    },

    toggleLike(activityId, travellerId) {
      const act = store.get('activities', activityId);
      if (!act || !travellerId) return;
      const cur = act.likes[travellerId];
      const likes = Object.assign({}, act.likes, { [travellerId]: { liked: !(cur && cur.liked), at: U.nowIso() } });
      store.upsert('activities', { id: activityId, likes });
    },

    /** Comentarios por persona (se combinan entre teléfonos como los favoritos). Texto vacío = borrado. */
    setComment(activityId, commentId, travellerId, text) {
      const act = store.get('activities', activityId);
      if (!act) return;
      const id = commentId || U.uid('c');
      const comments = Object.assign({}, act.comments, { [id]: { by: travellerId, text: String(text || '').trim(), at: U.nowIso() } });
      store.upsert('activities', { id: activityId, comments });
    },

    /** Catálogo curado de recomendaciones (solo lectura; no forma parte del itinerario). */
    recommendations(cityId) {
      const all = T.seed.recommendations();
      return cityId && cityId !== 'all' ? all.filter((r) => r.cityId === cityId) : all;
    },

    /* ---------- Ayudas de dominio ---------- */
    travellers() { return doc.travellers; },
    travellerIds() { return doc.travellers.map((t) => t.id); },
    traveller(id) { return store.get('travellers', id); },
    travellerName(id) { const t = store.traveller(id); return t ? t.name : id || '?'; },

    cities() { return doc.cities.slice().sort((a, b) => (a.arrive || '').localeCompare(b.arrive || '') || a.order - b.order); },
    cityChoice(city) {
      if (!city || !city.options) return null;
      return city.options.find((o) => o.key === city.choice) || null;
    },
    cityLabel(city) {
      if (!city) return '';
      if (city.options) {
        const ch = store.cityChoice(city);
        return ch ? ch.name : city.options.map((o) => o.name).join(' o ');
      }
      return city.name;
    },
    cityLabelById(id) { return store.cityLabel(store.get('cities', id)) || ''; },
    cityCoords(city) {
      const ch = store.cityChoice(city) || (city.options ? city.options[0] : null);
      return ch ? [ch.lat, ch.lon] : [city.lat, city.lon];
    },
    cityCountry(city) {
      const ch = store.cityChoice(city);
      if (ch) return ch.country;
      if (city.options) return city.options.map((o) => o.country).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
      return city.country;
    },
    /** Clave de foto de portada: weimar / prague para la ciudad sin decidir. */
    cityPhotoKey(city) {
      if (!city) return '';
      if (city.options) return (store.cityChoice(city) || city.options[0]).key;
      return city.id;
    },
    variantVisible(rec) {
      if (!rec.variant) return true;
      const city = store.get('cities', rec.cityId);
      if (!city || !city.options || city.choice === 'undecided' || !city.choice) return true;
      return rec.variant === city.choice;
    },
    /** Para opciones de trayecto (sin cityId): visible si la ciudad sin decidir lo permite. */
    optionVisible(opt, cityIds) {
      if (!opt.variant) return true;
      return cityIds.every((id) => {
        const c = store.get('cities', id);
        return !c || !c.options || !c.choice || c.choice === 'undecided' || c.choice === opt.variant;
      });
    },
    setCityChoice(cityId, choice) {
      const city = store.get('cities', cityId);
      if (!city) return;
      const ch = (city.options || []).find((o) => o.key === choice);
      store.upsert('cities', Object.assign({ id: cityId, choice }, ch ? { name: ch.name, country: ch.country, lat: ch.lat, lon: ch.lon } : {}));
    },
    updateTraveller(id, fields) {
      return store.upsert('travellers', Object.assign({ id }, fields));
    },

    /* ---------- Importar / exportar ---------- */
    exportPayload(exportedBy) {
      return Object.assign({}, doc, { exportedAt: U.nowIso(), exportedBy: exportedBy || '' });
    },
    validate,
    replaceWith(obj) {
      doc = normalizeDoc(obj);
      doc.updatedAt = U.nowIso();
      persist();
      notify();
    },
    mergeWith(obj) {
      const { doc: merged, stats } = mergeDocs(doc, normalizeDoc(obj));
      doc = merged;
      persist();
      notify();
      return stats;
    },
    reset() {
      doc = freshDoc();
      persist();
      notify();
    },
    sizeKB() {
      try { return Math.round((JSON.stringify(doc).length / 1024) * 10) / 10; } catch (e) { return 0; }
    },
  };

  store._internal = { normalizeDoc, mergeDocs, freshDoc, upgrade };
  T.store = store;
})(typeof self !== 'undefined' ? self : this);
