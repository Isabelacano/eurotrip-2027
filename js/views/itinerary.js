/*
 * PESTAÑA 2 — ITINERARIO (v3)
 * - "Nuestro itinerario": espacio colaborativo VACÍO por defecto. Cada categoría tiene "Añadir lugar":
 *   se pega un enlace, la app intenta leer título, foto, web y descripción (js/core/linkinfo.js)
 *   y, si no puede, se completan a mano.
 * - "Recomendaciones": catálogo curado y SEPARADO; nada pasa al itinerario salvo que alguien lo añada.
 */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C } = T;
  const esc = U.esc;
  T.views = T.views || {};
  const S = store.settings;
  const openComments = new Set();

  const catOf = (id) => C.ACTIVITY_CATEGORIES.find((c) => c.id === id) || { short: id, label: id, icon: '•' };
  const likers = (act) => Object.keys(act.likes || {}).filter((k) => act.likes[k].liked && store.traveller(k)).map((id) => store.traveller(id));
  const comments = (act) => Object.keys(act.comments || {}).map((k) => Object.assign({ id: k }, act.comments[k])).filter((c) => c.text).sort((a, b) => a.at.localeCompare(b.at));
  const pad = (n) => String(n).padStart(2, '0');

  function cityImage(city) {
    return (T.images || {})[(T.cityPhotos || {})[store.cityPhotoKey(city)]] || { card: '', file: '' };
  }

  function priceTag(cents) {
    if (cents == null) return '';
    if (cents === 0) return '<span class="price price--free">Gratis</span>';
    return '<span class="price">≈ ' + U.fmtEUR(cents) + ' p. p.</span>';
  }

  function matchesPrice(p, f) {
    if (f === 'free') return p === 0;
    if (f === 'budget') return p != null && p > 0 && p <= 1500;
    if (f === 'paid') return p != null && p > 1500;
    return true;
  }

  function hostLabel(act) {
    if (act.siteName) return act.siteName;
    return act.website ? T.linkInfo.siteFromHost(act.website) : '';
  }

  /* ---------- Tarjeta de un lugar del itinerario ---------- */
  function placeCard(act) {
    const me = T.app.profileId();
    const ls = likers(act);
    const iLike = ls.some((t) => t.id === me);
    const cat = catOf(act.category);
    const by = act.addedBy && store.traveller(act.addedBy);
    const cs = comments(act);
    const open = openComments.has(act.id);
    const site = hostLabel(act);
    const credit = act.imageCredit || '';
    return '<article class="place' + (act.planned ? ' is-planned' : '') + '" id="place-' + esc(act.id) + '">' +
      '<div class="place__media">' + ui.photo(act.image, { label: act.name, kicker: cat.short, credit, creditLabel: /wikimedia/.test(credit) ? 'Foto · Wikimedia Commons' : 'Foto' }) +
      (act.planned ? '<span class="place__flag">En el plan' + (act.date ? ' · ' + esc(U.fmtDate(act.date)) : '') + '</span>' : '') +
      '</div>' +
      '<div class="place__body">' +
      '<p class="place__kicker"><span>' + esc(cat.short) + '</span>' + (site ? '<span>' + esc(site) + '</span>' : '') + '</p>' +
      '<h4 class="place__title">' + esc(act.name) + '</h4>' +
      (act.description ? '<p class="place__desc">' + esc(act.description) + '</p>' : '') +
      (act.priceCents != null || act.address ? '<p class="place__meta">' + priceTag(act.priceCents) + (act.address ? ui.extLink(U.mapsUrl(act.address), esc(act.address), 'place__addr') : '') + '</p>' : '') +
      (act.notes ? '<p class="note">' + esc(act.notes) + '</p>' : '') +
      '<div class="place__people">' +
      (by ? '<span class="added-by">' + ui.avatar(by, 'xs') + '<span>Añadido por <b>' + esc(by.name) + '</b></span></span>' : '<span class="added-by muted">Añadido por el grupo</span>') +
      (ls.length ? '<span class="likers">' + ls.map((t) => ui.avatar(t, 'xs')).join('') + '<span>' + esc(ls.map((t) => t.name).join(', ')) + '</span></span>' : '') +
      '</div>' +
      '<div class="place__actions">' +
      '<button type="button" class="like' + (iLike ? ' is-liked' : '') + '" data-action="like" data-id="' + esc(act.id) + '" aria-pressed="' + iLike + '" aria-label="' + (iLike ? 'Quitar de favoritos' : 'Marcar como favorito') + '">' +
      '<span aria-hidden="true">' + (iLike ? '♥' : '♡') + '</span>' + (ls.length ? ' ' + ls.length : '') + '</button>' +
      '<button type="button" class="chip-btn' + (open ? ' is-active' : '') + '" data-action="comments" data-id="' + esc(act.id) + '" aria-expanded="' + open + '">Comentarios' + (cs.length ? ' · ' + cs.length : '') + '</button>' +
      (act.website ? ui.extLink(act.website, 'Abrir web ↗', 'chip-btn') : '') +
      '<span class="spacer"></span>' +
      '<button type="button" class="chip-btn' + (act.planned ? ' is-active' : '') + '" data-action="plan" data-id="' + esc(act.id) + '">' + (act.planned ? '✓ En el plan' : '+ Plan') + '</button>' +
      '<button type="button" class="link-btn" data-action="edit-activity" data-id="' + esc(act.id) + '">Editar</button>' +
      '</div>' +
      (open ? commentsHtml(act, cs) : '') +
      '</div></article>';
  }

  function commentsHtml(act, cs) {
    const me = T.app.profileId();
    return '<div class="comments">' +
      (cs.length ? '<ul>' + cs.map((c) => {
        const t = store.traveller(c.by);
        return '<li>' + (t ? ui.avatar(t, 'xs') : '') + '<div><p class="comments__who">' + esc(t ? t.name : '—') + ' · <span class="muted">' + esc(new Date(c.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })) + '</span></p><p>' + esc(c.text) + '</p></div>' +
          (c.by === me ? '<button type="button" class="icon-btn icon-btn--sm" data-action="del-comment" data-id="' + esc(act.id) + '" data-cid="' + esc(c.id) + '" aria-label="Borrar comentario">×</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="muted small">Todavía no hay comentarios.</p>') +
      '<form class="add-row" data-comment="' + esc(act.id) + '"><input name="text" maxlength="500" placeholder="Escribe un comentario…" aria-label="Nuevo comentario" autocomplete="off"><button type="submit" class="btn btn--sm btn--primary">Enviar</button></form>' +
      '</div>';
  }

  /* ---------- Tarjeta de recomendación (catálogo) ---------- */
  function recCard(rec, i, added) {
    const cat = catOf(rec.category);
    const variant = rec.variant ? '<span class="pill">Solo ' + (rec.variant === 'weimar' ? 'Weimar' : 'Praga') + '</span>' : '';
    return '<article class="rec' + (i % 7 === 0 ? ' rec--wide' : '') + '">' +
      '<div class="rec__media">' + ui.photo(rec.image, { label: rec.name, kicker: cat.short, credit: rec.imageCredit }) + '</div>' +
      '<div class="rec__body">' +
      '<p class="place__kicker"><span>' + pad(i + 1) + ' · ' + esc(cat.short) + '</span>' + variant + '</p>' +
      '<h4 class="rec__title">' + esc(rec.name) + '</h4>' +
      '<p class="place__desc">' + esc(rec.description) + '</p>' +
      '<p class="place__meta">' + (priceTag(rec.priceCents) || '<span class="price muted">Precio por confirmar</span>') + (rec.address ? ui.extLink(U.mapsUrl(rec.address), esc(rec.address), 'place__addr') : '') + '</p>' +
      '<div class="place__actions">' +
      (rec.website ? ui.extLink(rec.website, 'Web ↗', 'chip-btn') : '') +
      ui.extLink(U.youtubeSearchUrl(rec.name + ' ' + store.cityLabelById(rec.cityId)), 'Vídeos ↗', 'chip-btn') +
      '<span class="spacer"></span>' +
      (added ? '<a class="chip-btn is-active" href="#place-' + esc(added.id) + '" data-action="goto" data-id="' + esc(added.id) + '">✓ En el itinerario</a>'
        : '<button type="button" class="btn btn--sm btn--primary" data-action="adopt" data-id="' + esc(rec.id) + '">+ Añadir al itinerario</button>') +
      '</div></div></article>';
  }

  /* ---------- Bloques ---------- */
  function cityStrip(activeId) {
    const items = store.cities().map((c) => ({ id: c.id, label: store.cityLabel(c), img: cityImage(c).card, dates: U.fmtRange(c.arrive, c.depart) }));
    return '<nav class="city-strip" aria-label="Elegir ciudad">' + items.map((it, i) =>
      '<button type="button" class="city-tile' + (it.id === activeId ? ' is-active' : '') + '" data-action="city" data-id="' + esc(it.id) + '" aria-pressed="' + (it.id === activeId) + '">' +
      ui.photo(it.img, { cls: 'ph--tile', label: it.label, sizes: '140px' }) +
      '<span class="city-tile__num">' + pad(i + 1) + '</span>' +
      '<span class="city-tile__name">' + esc(it.label) + '</span><span class="city-tile__dates">' + esc(it.dates) + '</span>' +
      '</button>').join('') + '</nav>';
  }

  function cityHero(city, nPlaces, nRecs) {
    const n = U.nights(city.arrive, city.depart);
    const label = store.cityLabel(city);
    const img = cityImage(city);
    const idx = store.cities().findIndex((c) => c.id === city.id) + 1;
    return '<header class="city-hero">' +
      ui.photo(img.card, { cls: 'ph--hero', label, kicker: store.cityCountry(city), credit: img.file, eager: true, hero: true }) +
      '<div class="city-hero__glow" aria-hidden="true"></div>' +
      '<div class="city-hero__text">' +
      '<p class="meta-row meta-row--light"><span>Parada ' + pad(idx) + ' · ' + esc(store.cityCountry(city)) + '</span><span>(' + n + ' noche' + (n === 1 ? '' : 's') + ')</span></p>' +
      '<h2 class="city-hero__title">' + esc(label) + '</h2>' +
      '<p class="city-hero__dates">' + esc(U.fmtDateLong(city.arrive)) + ' → ' + esc(U.fmtDateLong(city.depart)) + '</p>' +
      '</div></header>' +
      '<div class="city-intro">' +
      '<p class="lede">' + esc(city.overview) + '</p>' +
      (city.options ? '<p class="small muted">Decidan entre ' + esc(city.options.map((o) => o.name).join(' y ')) + ' en <a href="#route">Ruta → Cronología</a>.</p>' : '') +
      (city.notes ? '<p class="note">' + esc(city.notes) + '</p>' : '') +
      '<dl class="mini-stats"><div><dt>En el itinerario</dt><dd>' + nPlaces + '</dd></div><div><dt>Recomendaciones</dt><dd>' + nRecs + '</dd></div><div><dt>Noches</dt><dd>' + n + '</dd></div></dl>' +
      '<button type="button" class="link-btn" data-action="edit-city" data-id="' + esc(city.id) + '">Editar fechas y notas de la ciudad</button>' +
      '</div>';
  }

  function planHtml(city, acts) {
    const planned = acts.filter((a) => a.planned);
    if (!planned.length) return '';
    const days = [];
    for (let d = city.arrive; d && d <= city.depart; d = U.isoAddDays(d, 1)) days.push(d);
    const undated = planned.filter((a) => !a.date || a.date < city.arrive || a.date > city.depart);
    const col = (top, num, items) => '<div class="plan__day' + (items.length ? '' : ' is-empty') + '"><p class="plan__date"><span>' + esc(top) + '</span><b>' + esc(num) + '</b></p><ul>' +
      (items.length ? items.map((a) => '<li><button type="button" data-action="plan" data-id="' + esc(a.id) + '">' + esc(a.name) + '</button></li>').join('') : '<li class="muted small">Libre</li>') + '</ul></div>';
    return '<section class="plan">' + ui.rule('Mi plan por días', '<span class="rule__count">' + planned.length + '</span>') +
      '<div class="plan__days">' + days.map((d) => col(U.weekday(d), String(Number(d.slice(8))), planned.filter((a) => a.date === d))).join('') +
      (undated.length ? col('Sin', '—', undated) : '') + '</div></section>';
  }

  function categorySection(cat, items, idx, cityId) {
    const head = '<header class="cat__head"><span class="cat__num">' + pad(idx + 1) + '</span><h3 class="cat__title">' + esc(cat.label) + '</h3>' +
      '<span class="cat__count">[ ' + items.length + ' ]</span>' +
      '<button type="button" class="btn btn--sm ' + (items.length ? '' : 'btn--primary') + '" data-action="add-place" data-cat="' + cat.id + '" data-city="' + esc(cityId) + '">+ Añadir lugar</button></header>';
    return '<section class="cat' + (items.length ? '' : ' cat--empty') + '" id="cat-' + cat.id + '">' + head +
      (items.length ? '<div class="place-list">' + items.map(placeCard).join('') + '</div>' : '') + '</section>';
  }

  /* ---------- Formularios ---------- */
  function placeForm(act, preset) {
    preset = preset || {};
    const me = T.app.profileId();
    const city = store.get('cities', (act && act.cityId) || preset.cityId) || store.cities()[0];
    const values = act || Object.assign({ cityId: city ? city.id : '', category: 'architecture', priceCents: null, addedBy: me }, preset);
    const fields = [
      { type: 'html', html: '<div class="field link-field"><label for="f-website">Enlace del lugar</label>' +
        '<div class="link-field__row"><input id="f-website" name="website" type="url" inputmode="url" autocapitalize="off" placeholder="Pega un enlace: web, Google Maps, Instagram, Airbnb…" value="' + esc(values.website || '') + '">' +
        '<button type="button" class="btn btn--sm btn--primary" data-lookup>Leer enlace</button></div>' +
        '<p class="link-field__status small" data-lookup-status>Pega el enlace y pulsa <b>Leer enlace</b> para rellenar el nombre, la foto y la descripción automáticamente. También pueden escribirlos a mano.</p></div>' },
      { name: 'name', label: 'Nombre del lugar o actividad', required: true, placeholder: 'p. ej. Mercado de San Miguel' },
      { name: 'image', label: 'Foto', type: 'image', maxSize: 1200, quality: 0.78, hint: 'Se rellena al leer el enlace. También pueden pegar otro enlace de imagen o subir una foto. Se muestra en blanco y negro.' },
      { name: 'description', label: 'Descripción breve', type: 'textarea', rows: 3 },
      { name: 'category', label: 'Categoría', type: 'select', half: true, options: C.ACTIVITY_CATEGORIES.map((c) => ({ value: c.id, label: c.label })) },
      { name: 'cityId', label: 'Ciudad', type: 'select', half: true, options: store.cities().map((c) => ({ value: c.id, label: store.cityLabel(c) })) },
      { name: 'siteName', label: 'Web / fuente', half: true, placeholder: 'p. ej. Google Maps' },
      { name: 'addedBy', label: 'Añadido por', type: 'select', half: true, options: [{ value: '', label: 'El grupo' }].concat(store.travellers().map((t) => ({ value: t.id, label: t.name }))) },
      { name: 'priceCents', label: 'Precio por persona (opcional)', type: 'money', half: true, placeholder: '0 = gratis' },
      { name: 'date', label: 'Fecha prevista (opcional)', type: 'date', half: true },
      { name: 'address', label: 'Dirección (opcional)' },
      { name: 'notes', label: 'Notas personales', type: 'textarea', rows: 2 },
    ];
    if (city && city.options) fields.splice(6, 0, { name: 'variant', label: 'Solo para', type: 'select', options: [{ value: '', label: 'Cualquier opción' }].concat(city.options.map((o) => ({ value: o.key, label: o.name }))) });
    let busy = false;
    ui.openForm({
      title: act ? 'Editar lugar' : 'Añadir lugar · ' + catOf(values.category).short,
      fields,
      values,
      submitLabel: act ? 'Guardar' : 'Añadir al itinerario',
      onFormClick(e, api) {
        if (!e.target.closest('[data-lookup]') || busy) return;
        const f = api.form;
        const status = f.querySelector('[data-lookup-status]');
        const url = f.elements.website.value.trim();
        if (!U.safeUrl(url)) { status.className = 'link-field__status small is-error'; status.textContent = 'Pega un enlace completo que empiece por https://'; return false; }
        busy = true;
        status.className = 'link-field__status small is-loading';
        status.innerHTML = '<span class="spinner" aria-hidden="true"></span> Leyendo el enlace…';
        T.linkInfo.lookup(url).then((r) => {
          busy = false;
          const fill = (name, v) => { if (v && f.elements[name] && !f.elements[name].value.trim()) f.elements[name].value = v; };
          fill('name', r.title);
          fill('description', r.description);
          fill('siteName', r.siteName);
          if (r.image && !f.elements.image.value) api.setImage('image', r.image);
          if (r.ok) {
            status.className = 'link-field__status small is-ok';
            status.textContent = '✓ Datos leídos (' + r.source + '). Revísenlos y completen lo que falte.';
          } else {
            status.className = 'link-field__status small is-error';
            status.textContent = r.error + (r.title ? ' Hemos deducido el nombre del enlace.' : '');
            if (!f.elements.name.value.trim()) f.elements.name.focus();
          }
        });
        return false;
      },
      onSubmit(v) {
        const site = v.website || (act && act.website) || '';
        const linkEl = document.getElementById('f-website');
        const typed = linkEl ? linkEl.value.trim() : site;
        if (typed && !U.safeUrl(typed)) return 'El enlace debe empezar por http(s)://';
        v.website = typed ? U.safeUrl(typed) : '';
        if (!v.siteName && v.website) v.siteName = T.linkInfo.siteFromHost(v.website);
        if (act && act.image && v.image === act.image) v.imageCredit = act.imageCredit;
        else if (preset.image && v.image === preset.image) v.imageCredit = preset.imageCredit || '';
        else v.imageCredit = '';
        if (preset.recId && !act) v.recId = preset.recId;
        // Lugar nuevo: mostrar su ciudad (y su categoría si se añadió desde "Nuestro itinerario").
        // Desde Recomendaciones se queda en Recomendaciones para seguir eligiendo.
        if (!act) S.set('itinCity', v.cityId);
        store.upsert('activities', Object.assign({}, act ? { id: act.id } : {}, v));
        ui.toast(act ? 'Lugar actualizado' : preset.recId ? 'Añadido al itinerario ✓ (pestaña "Nuestro itinerario")' : 'Añadido al itinerario ✓');
      },
      onDelete: act ? () => { store.remove('activities', act.id); ui.toast('Lugar eliminado'); } : null,
    });
  }

  function planSheet(act) {
    const city = store.get('cities', act.cityId);
    const days = [];
    if (city) for (let d = city.arrive; d && d <= city.depart; d = U.isoAddDays(d, 1)) days.push(d);
    ui.sheet({
      title: act.planned ? 'En mi plan' : 'Añadir al plan',
      noFocus: true,
      html: '<p class="lede-sm">' + esc(act.name) + '</p><p class="muted small">¿Qué día?</p>' +
        '<div class="day-pick">' + days.map((d) => '<button type="button" class="day-btn' + (act.planned && act.date === d ? ' is-active' : '') + '" data-day="' + d + '"><span>' + esc(U.weekday(d)) + '</span><b>' + Number(d.slice(8)) + '</b></button>').join('') +
        '<button type="button" class="day-btn' + (act.planned && !act.date ? ' is-active' : '') + '" data-day=""><span>Sin</span><b>—</b></button></div>' +
        (act.planned ? '<div class="row-actions"><button type="button" class="btn btn--danger-ghost" data-unplan>Quitar del plan</button></div>' : ''),
      onClick(e, close) {
        const b = e.target.closest('[data-day]');
        if (b) { store.upsert('activities', { id: act.id, planned: true, date: b.dataset.day }); close(); ui.toast('Añadido al plan ✓'); return; }
        if (e.target.closest('[data-unplan]')) { store.upsert('activities', { id: act.id, planned: false }); close(); ui.toast('Quitado del plan'); }
      },
    });
  }

  function cityForm(city) {
    ui.openForm({
      title: 'Editar ' + store.cityLabel(city),
      fields: [
        { name: 'arrive', label: 'Llegada', type: 'date', half: true, required: true },
        { name: 'depart', label: 'Salida', type: 'date', half: true, required: true },
        { name: 'overview', label: 'Resumen', type: 'textarea', rows: 4 },
        { name: 'notes', label: 'Notas', type: 'textarea', rows: 3 },
      ],
      values: city,
      preview: (v) => (U.isIsoDate(v.arrive) && U.isIsoDate(v.depart) ? '<p>' + U.nights(v.arrive, v.depart) + ' noches</p>' : ''),
      onSubmit(v) {
        if (v.depart <= v.arrive) return 'La salida debe ser posterior a la llegada.';
        store.upsert('cities', Object.assign({ id: city.id }, v));
        ui.toast('Ciudad actualizada');
      },
    });
  }

  function defaultCity() {
    const today = U.todayIso();
    const c = store.cities().find((x) => x.arrive <= today && today < x.depart);
    return c ? c.id : store.cities()[0].id;
  }

  function adoptedMap() {
    const m = {};
    store.list('activities').forEach((a) => { if (a.recId) m[a.recId] = a; });
    return m;
  }

  /* ---------- Vista ---------- */
  T.views.itinerary = {
    render(el) {
      let cityId = S.get('itinCity', '') || defaultCity();
      if (!store.get('cities', cityId)) cityId = defaultCity();
      const city = store.get('cities', cityId);
      const tab = S.get('itinTab', 'mine');
      const catF = S.get('itinCat', 'all');
      const favF = S.get('itinFav', 'all');
      const priceF = S.get('itinPrice', 'all');

      const mine = store.list('activities').filter((a) => a.cityId === cityId).filter(store.variantVisible);
      const recs = store.recommendations(cityId).filter(store.variantVisible);
      const adopted = adoptedMap();

      let body = '';
      if (tab === 'mine') {
        const filtered = mine.filter((a) => {
          if (favF === 'all') return true;
          if (favF === 'planned') return a.planned;
          if (favF === 'any') return likers(a).length > 0;
          if (favF.startsWith('by:')) return a.addedBy === favF.slice(3);
          return likers(a).some((t) => t.id === favF);
        }).sort((a, b) => likers(b).length - likers(a).length || (b.createdAt || '').localeCompare(a.createdAt || ''));
        const cats = C.ACTIVITY_CATEGORIES.filter((c) => catF === 'all' || c.id === catF);
        body =
          planHtml(city, mine) +
          '<div class="toolbar">' +
          '<div class="chips" role="group" aria-label="Ir a una categoría">' +
          [{ id: 'all', short: 'Todas' }].concat(C.ACTIVITY_CATEGORIES).map((c) => {
            const n = c.id === 'all' ? filtered.length : filtered.filter((a) => a.category === c.id).length;
            return '<button type="button" class="chip' + (c.id === catF ? ' is-active' : '') + '" data-action="filter-cat" data-id="' + c.id + '" aria-pressed="' + (c.id === catF) + '">' + esc(c.short) + (n ? '<span class="chip__n">' + n + '</span>' : '') + '</button>';
          }).join('') + '</div>' +
          '<select data-action="filter-fav" aria-label="Filtrar">' +
          '<option value="all">Todos los lugares</option>' +
          '<option value="any"' + (favF === 'any' ? ' selected' : '') + '>♥ Favoritos de alguien</option>' +
          '<option value="planned"' + (favF === 'planned' ? ' selected' : '') + '>✓ En el plan</option>' +
          store.travellers().map((t) => '<option value="' + esc(t.id) + '"' + (favF === t.id ? ' selected' : '') + '>♥ Favoritos de ' + esc(t.name) + '</option>').join('') +
          store.travellers().map((t) => '<option value="by:' + esc(t.id) + '"' + (favF === 'by:' + t.id ? ' selected' : '') + '>Añadidos por ' + esc(t.name) + '</option>').join('') +
          '</select></div>' +
          (mine.length ? '' : '<div class="empty-hero"><p class="meta-row"><span>Itinerario vacío</span><span>(' + esc(store.cityLabel(city)) + ')</span></p>' +
            '<p class="empty-hero__title">Construyan el plan<br>entre las cuatro.</p>' +
            '<p>Elijan una categoría y pulsen <b>+ Añadir lugar</b>: peguen un enlace (web, Google Maps, Instagram, Airbnb…) y la app intentará leer el nombre, la foto y la descripción. ¿Sin ideas? Miren las <button type="button" class="link-btn" data-action="tab" data-id="recs">Recomendaciones</button>.</p></div>') +
          cats.map((c) => categorySection(c, filtered.filter((a) => a.category === c.id), C.ACTIVITY_CATEGORIES.indexOf(c), cityId)).join('');
      } else {
        const list = recs.filter((r) => (catF === 'all' || r.category === catF) && matchesPrice(r.priceCents, priceF))
          .sort((a, b) => Number(!!b.image) - Number(!!a.image) || C.ACTIVITY_CATEGORIES.findIndex((c) => c.id === a.category) - C.ACTIVITY_CATEGORIES.findIndex((c) => c.id === b.category));
        body =
          '<div class="rec-intro"><p class="meta-row"><span>Recomendaciones curadas</span><span>(' + recs.length + ')</span></p>' +
          '<p>Una selección con foco en arquitectura para inspirarse. <b>No forman parte del itinerario</b>: pulsen <b>+ Añadir al itinerario</b> en las que les interesen.</p></div>' +
          '<div class="toolbar">' +
          '<div class="chips" role="group" aria-label="Filtrar recomendaciones por categoría">' +
          [{ id: 'all', short: 'Todas' }].concat(C.ACTIVITY_CATEGORIES).map((c) => {
            const n = c.id === 'all' ? recs.length : recs.filter((r) => r.category === c.id).length;
            if (c.id !== 'all' && !n) return '';
            return '<button type="button" class="chip' + (c.id === catF ? ' is-active' : '') + '" data-action="filter-cat" data-id="' + c.id + '" aria-pressed="' + (c.id === catF) + '">' + esc(c.short) + '<span class="chip__n">' + n + '</span></button>';
          }).join('') + '</div>' +
          '<select data-action="filter-price" aria-label="Filtrar por precio">' + C.PRICE_FILTERS.map((p) => '<option value="' + p.id + '"' + (p.id === priceF ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select>' +
          '</div>' +
          (list.length ? '<div class="rec-grid">' + list.map((r, i) => recCard(r, i, adopted[r.id])).join('') + '</div>' : ui.empty('No hay recomendaciones con estos filtros.')) +
          '<p class="disclaimer">Precios estimados y orientativos. Fotos de Wikimedia Commons con licencias libres (toquen "Foto" para ver autoría y licencia). Comprueben horarios en las webs oficiales.</p>';
      }

      el.innerHTML =
        '<section class="itin-top"><div class="page page--flush"><p class="meta-row"><span>Itinerario</span><span>(' + store.cities().length + ' ciudades)</span></p>' +
        '<h2 class="display">Itinerario</h2></div>' + cityStrip(cityId) + '</section>' +
        cityHero(city, mine.length, recs.length) +
        '<section class="page">' +
        '<div class="tabs" role="tablist">' +
        '<button type="button" role="tab" class="tab' + (tab === 'mine' ? ' is-active' : '') + '" data-action="tab" data-id="mine" aria-selected="' + (tab === 'mine') + '">Nuestro itinerario <span>[ ' + mine.length + ' ]</span></button>' +
        '<button type="button" role="tab" class="tab' + (tab === 'recs' ? ' is-active' : '') + '" data-action="tab" data-id="recs" aria-selected="' + (tab === 'recs') + '">Recomendaciones <span>[ ' + recs.length + ' ]</span></button>' +
        '</div>' +
        (S.get('likesInfoSeen') ? '' : '<div class="info">Los lugares, favoritos y comentarios se guardan en este teléfono y se comparten con <b>Exportar → Importar → Combinar</b> (menú ⋮). <button type="button" class="link-btn" data-action="dismiss-info">Entendido</button></div>') +
        body + '</section>' +
        (tab === 'mine' ? '<button type="button" class="fab" data-action="add-place" data-cat="' + esc(catF !== 'all' ? catF : 'architecture') + '" data-city="' + esc(cityId) + '" aria-label="Añadir lugar">+</button>' : '');

      const strip = el.querySelector('.city-strip');
      const active = strip && strip.querySelector('.city-tile.is-active');
      if (active && active.offsetLeft > strip.clientWidth * 0.6) strip.scrollLeft = active.offsetLeft - 16;
    },
    onClick(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const id = a.dataset.id;
      switch (a.dataset.action) {
        case 'city': S.set('itinCity', id); T.app.render(); window.scrollTo(0, 0); break;
        case 'tab': S.set('itinTab', id); S.set('itinCat', 'all'); T.app.render(); break;
        case 'filter-cat': S.set('itinCat', id); T.app.render(); break;
        case 'like':
          if (!T.app.profile()) { T.app.chooseProfile(false); return; }
          store.toggleLike(id, T.app.profileId());
          break;
        case 'comments': if (openComments.has(id)) openComments.delete(id); else openComments.add(id); T.app.render(); break;
        case 'del-comment': store.setComment(id, a.dataset.cid, T.app.profileId(), ''); break;
        case 'plan': planSheet(store.get('activities', id)); break;
        case 'add-place': placeForm(null, { category: a.dataset.cat || 'architecture', cityId: a.dataset.city || defaultCity() }); break;
        case 'adopt': {
          const rec = store.recommendations().find((r) => r.id === id);
          if (!rec) return;
          placeForm(null, {
            recId: rec.id, cityId: rec.cityId, category: rec.category, name: rec.name, description: rec.description, image: rec.image, imageCredit: rec.imageCredit,
            website: rec.website, siteName: rec.website ? T.linkInfo.siteFromHost(rec.website) : 'Recomendación', priceCents: rec.priceCents, address: rec.address, variant: rec.variant || '',
          });
          break;
        }
        case 'goto':
          e.preventDefault();
          S.set('itinTab', 'mine'); S.set('itinCat', 'all'); T.app.render();
          requestAnimationFrame(() => { const t = document.getElementById('place-' + id); if (t) t.scrollIntoView({ block: 'center' }); });
          break;
        case 'edit-activity': placeForm(store.get('activities', id)); break;
        case 'edit-city': cityForm(store.get('cities', id)); break;
        case 'dismiss-info': S.set('likesInfoSeen', true); T.app.render(); break;
      }
    },
    onChange(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'filter-price') { S.set('itinPrice', a.value); T.app.render(); }
      if (a.dataset.action === 'filter-fav') { S.set('itinFav', a.value); T.app.render(); }
    },
    onSubmit(e) {
      const form = e.target.closest('form[data-comment]');
      if (!form) return;
      e.preventDefault();
      const text = form.elements.text.value.trim();
      if (!text) return;
      if (!T.app.profile()) { T.app.chooseProfile(false); return; }
      const id = form.dataset.comment;
      openComments.add(id);
      store.setComment(id, null, T.app.profileId(), text);
    },
  };
})(typeof self !== 'undefined' ? self : this);
