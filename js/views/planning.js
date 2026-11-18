/* PESTAÑA 4 — PLANIFICACIÓN: (A) alojamiento y (B) transporte y billetes. */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C } = T;
  const esc = U.esc;
  T.views = T.views || {};
  const S = store.settings;

  const perPerson = (acc) => (acc.totalCents == null ? null : Math.round(acc.totalCents / Math.max(1, acc.people)));
  const isPlaceholder = (n) => /por decidir|to be decided|tbd/i.test(n || '');

  /** Nombre legible de la plataforma de reserva a partir del enlace. */
  function platform(url) {
    const safe = U.safeUrl(url);
    if (!safe) return '';
    const host = new URL(safe).hostname.replace(/^www\./, '');
    const known = [[/airbnb\./, 'Airbnb'], [/booking\.com$/, 'Booking.com'], [/hostelworld\./, 'Hostelworld'], [/expedia\./, 'Expedia'], [/hotels\.com$/, 'Hotels.com'], [/vrbo\./, 'Vrbo'], [/agoda\./, 'Agoda'],
      [/bahn\.de$/, 'Deutsche Bahn'], [/renfe\.com$/, 'Renfe'], [/trenitalia\.com$/, 'Trenitalia'], [/italotreno\./, 'Italo'], [/flixbus\./, 'FlixBus'], [/ryanair\./, 'Ryanair'], [/vueling\./, 'Vueling'], [/oebb\.at$/, 'ÖBB'], [/iryo\./, 'Iryo'], [/ouigo\./, 'Ouigo']];
    const k = known.find(([re]) => re.test(host));
    return k ? k[1] : host;
  }

  function bookingButton(url, verb) {
    const p = platform(url);
    return p ? ui.extLink(url, (verb || 'Abrir reserva en') + ' ' + esc(p) + ' ↗', 'btn btn--sm btn--accent') : '';
  }

  /* ---------- Alojamiento ---------- */
  function accCard(acc) {
    const n = U.nights(acc.checkIn, acc.checkOut);
    const pp = perPerson(acc);
    const pay = C.label(C.PAYMENT, acc.payment);
    return '<article class="booking' + (acc.confirmed ? ' is-confirmed' : '') + '">' +
      '<header class="booking__head"><div>' +
      '<p class="kicker">' + esc(store.cityLabelById(acc.cityId) || 'Sin ciudad') + ' · ' + esc(C.label(C.ACC_TYPES, acc.type)) + '</p>' +
      '<h4 class="booking__title' + (isPlaceholder(acc.name) ? ' muted' : '') + '">' + esc(acc.name || 'Sin nombre') + '</h4></div>' +
      '<button type="button" class="confirm-toggle' + (acc.confirmed ? ' is-on' : '') + '" data-action="toggle-acc" data-id="' + esc(acc.id) + '" aria-pressed="' + acc.confirmed + '">' + (acc.confirmed ? '✓ Confirmada' : 'Sin confirmar') + '</button>' +
      '</header>' +
      '<dl class="kv">' +
      '<div><dt>Fechas</dt><dd>' + esc(U.fmtRange(acc.checkIn, acc.checkOut)) + ' · ' + n + ' noche' + (n === 1 ? '' : 's') + '</dd></div>' +
      '<div><dt>Precio</dt><dd>' + (acc.totalCents == null ? '<span class="muted">—</span>' : U.fmtEUR(acc.totalCents) + ' total · <b>' + U.fmtEUR(pp) + '</b> p. p. (' + acc.people + ' personas)' + (n && acc.totalCents ? ' · ' + U.fmtEUR(Math.round(pp / n)) + ' p. p./noche' : '')) + '</dd></div>' +
      '<div><dt>Pago</dt><dd><span class="badge ' + (acc.payment === 'paid' || acc.payment === 'free' ? 'badge--ok' : 'badge--warn') + '">' + esc(pay) + '</span></dd></div>' +
      (acc.confirmation ? '<div><dt>N.º confirmación</dt><dd class="mono">' + esc(acc.confirmation) + '</dd></div>' : '') +
      (acc.address ? '<div><dt>Dirección</dt><dd>' + ui.extLink(U.mapsUrl(acc.address), esc(acc.address)) + '</dd></div>' : '') +
      (acc.link ? '<div><dt>Reserva</dt><dd class="link-cell">' + ui.extLink(acc.link, esc(platform(acc.link)) + ' · ' + esc(U.safeUrl(acc.link).replace(/^https?:\/\//, '').slice(0, 40)) + '…') + '</dd></div>' : '') +
      '</dl>' +
      (acc.notes ? '<p class="note">📝 ' + esc(acc.notes) + '</p>' : '') +
      '<footer class="row-actions">' + (acc.link ? bookingButton(acc.link) : '<span class="small muted">Sin enlace de reserva</span>') +
      '<button type="button" class="btn btn--sm" data-action="edit-acc" data-id="' + esc(acc.id) + '">Editar</button></footer>' +
      '</article>';
  }

  function accForm(acc) {
    const fields = [
      { name: 'name', label: 'Nombre del hotel, hostal o Airbnb', required: true },
      { name: 'link', label: 'Enlace de la reserva', type: 'url', placeholder: 'Pega aquí el enlace de Airbnb, Booking.com, Hostelworld, web del hotel…', hint: 'Se mostrará con un botón para abrir la reserva original.' },
      { name: 'type', label: 'Tipo', type: 'select', half: true, options: C.ACC_TYPES.map((t) => ({ value: t.id, label: t.label })) },
      { name: 'cityId', label: 'Ciudad', type: 'select', half: true, options: store.cities().map((c) => ({ value: c.id, label: store.cityLabel(c) })) },
      { name: 'checkIn', label: 'Entrada', type: 'date', half: true },
      { name: 'checkOut', label: 'Salida', type: 'date', half: true },
      { name: 'totalCents', label: 'Precio total', type: 'money', half: true },
      { name: 'people', label: 'Dividir entre (personas)', type: 'number', half: true, min: 1 },
      { name: 'payment', label: 'Estado del pago', type: 'select', half: true, options: C.PAYMENT.map((p) => ({ value: p.id, label: p.label })) },
      { name: 'confirmation', label: 'N.º de confirmación', half: true },
      { name: 'address', label: 'Dirección' },
      { name: 'confirmed', label: 'Reserva confirmada', type: 'toggle' },
      { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
    ];
    const city = store.cities()[0];
    ui.openForm({
      title: acc ? 'Editar alojamiento' : 'Nuevo alojamiento',
      fields,
      values: acc || { type: 'hotel', cityId: city ? city.id : '', checkIn: city ? city.arrive : '', checkOut: city ? city.depart : '', people: 4, payment: 'unpaid' },
      preview(v) {
        const n = U.nights(v.checkIn, v.checkOut);
        const pp = v.totalCents != null && v.people ? Math.round(v.totalCents / v.people) : null;
        return '<p class="small">🌙 ' + n + ' noche' + (n === 1 ? '' : 's') + (pp != null ? ' · <b>' + U.fmtEUR(pp) + '</b> por persona' + (n ? ' · ' + U.fmtEUR(Math.round(pp / n)) + ' p. p./noche' : '') : '') +
          (v.link ? ' · Plataforma: <b>' + esc(platform(v.link)) + '</b>' : '') + '</p>';
      },
      onSubmit(v) {
        if (v.checkIn && v.checkOut && v.checkOut <= v.checkIn) return 'La salida debe ser posterior a la entrada.';
        if (!v.people || v.people < 1) v.people = 1;
        store.upsert('accommodations', Object.assign({}, acc ? { id: acc.id } : {}, v));
        ui.toast('Guardado');
      },
      onDelete: acc ? () => { store.remove('accommodations', acc.id); ui.toast('Eliminado'); } : null,
    });
  }

  function accHtml() {
    const list = store.list('accommodations').filter(store.variantVisible).sort((a, b) => (a.checkIn || '9').localeCompare(b.checkIn || '9'));
    const confirmed = list.filter((a) => a.confirmed).length;
    const total = list.reduce((s, a) => s + (a.totalCents || 0), 0);
    const pp = list.reduce((s, a) => s + (perPerson(a) || 0), 0);
    const pending = list.filter((a) => !a.confirmed);
    return '<dl class="stat-row">' +
      '<div><dt>Confirmadas</dt><dd>' + confirmed + '/' + list.length + '</dd></div>' +
      '<div><dt>Total conocido</dt><dd>' + U.fmtEUR(total) + '</dd></div>' +
      '<div><dt>Por persona</dt><dd>' + U.fmtEUR(pp) + '</dd></div></dl>' +
      (pending.length ? '<p class="small"><span class="pill pill--accent">Pendientes</span> ' + esc(pending.map((a) => store.cityLabelById(a.cityId)).join(' · ')) + '</p>' : '') +
      '<div class="booking-grid">' + (list.length ? list.map(accCard).join('') : ui.empty('Todavía no hay alojamientos.')) + '</div>' +
      '<p class="muted small">Los totales solo incluyen estancias con precio. Se ocultan las opciones de la ciudad alternativa que no se eligió.</p>';
  }

  /* ---------- Transporte ---------- */
  function trCard(t) {
    const all = t.travellers.length === store.travellers().length || !t.travellers.length;
    const icon = C.icon(C.MODES, t.type);
    return '<article class="booking' + (t.confirmed ? ' is-confirmed' : '') + (t.status === 'cancelled' ? ' is-cancelled' : '') + '">' +
      '<header class="booking__head"><div>' +
      '<p class="kicker">' + icon + ' ' + esc(C.label(C.MODES, t.type)) + (t.company ? ' · ' + esc(t.company) : '') + '</p>' +
      '<h4 class="booking__title">' + esc(t.from || '?') + ' <span class="arrow">→</span> ' + esc(t.to || '?') + '</h4></div>' +
      '<button type="button" class="confirm-toggle' + (t.confirmed ? ' is-on' : '') + '" data-action="toggle-tr" data-id="' + esc(t.id) + '" aria-pressed="' + t.confirmed + '">' + (t.confirmed ? '✓ Confirmado' : 'Sin confirmar') + '</button>' +
      '</header>' +
      '<dl class="kv">' +
      '<div><dt>Salida</dt><dd>' + (t.date ? esc(U.fmtDateLong(t.date)) + (t.time ? ' · ' + esc(t.time) : '') : '<span class="muted">—</span>') + '</dd></div>' +
      (t.arriveDate || t.arriveTime ? '<div><dt>Llegada</dt><dd>' + esc(t.arriveDate ? U.fmtDateLong(t.arriveDate) : '') + (t.arriveTime ? ' · ' + esc(t.arriveTime) : '') + '</dd></div>' : '') +
      '<div><dt>Precio</dt><dd>' + (t.priceCents == null ? '<span class="muted">—</span>' : '<b>' + U.fmtEUR(t.priceCents) + '</b> por persona <span class="pill' + (t.priceEstimated ? '' : ' pill--ok') + '">' + (t.priceEstimated ? 'estimado' : 'confirmado') + '</span>') + '</dd></div>' +
      '<div><dt>Estado</dt><dd><span class="badge ' + (t.status === 'ticket' || t.status === 'booked' ? 'badge--ok' : t.status === 'cancelled' ? 'badge--bad' : 'badge--warn') + '">' + esc(C.label(C.TICKET_STATUS, t.status)) + '</span></dd></div>' +
      '<div><dt>Quién</dt><dd>' + (all ? 'Todo el grupo' : t.travellers.map((id) => ui.avatar(store.traveller(id), 'xs') + ' ' + esc(store.travellerName(id))).join(', ')) + '</dd></div>' +
      (t.reference ? '<div><dt>N.º reserva</dt><dd class="mono">' + esc(t.reference) + '</dd></div>' : '') +
      '</dl>' +
      (t.notes ? '<p class="note">📝 ' + esc(t.notes) + '</p>' : '') +
      '<footer class="row-actions">' + bookingButton(t.link, 'Reserva en') + (t.ticketLink ? ui.extLink(t.ticketLink, '🎫 Billete ↗', 'btn btn--sm') : '') +
      '<button type="button" class="btn btn--sm" data-action="edit-tr" data-id="' + esc(t.id) + '">Editar</button></footer>' +
      '</article>';
  }

  function trForm(t) {
    const people = store.travellers();
    ui.openForm({
      title: t ? 'Editar transporte' : 'Nuevo transporte',
      fields: [
        { name: 'type', label: 'Tipo', type: 'select', half: true, options: C.MODES.map((m) => ({ value: m.id, label: m.icon + ' ' + m.label })) },
        { name: 'company', label: 'Compañía', half: true, placeholder: 'p. ej. Iryo, Ryanair' },
        { name: 'from', label: 'Origen', required: true, half: true },
        { name: 'to', label: 'Destino', required: true, half: true },
        { name: 'date', label: 'Fecha de salida', type: 'date', half: true },
        { name: 'time', label: 'Hora de salida', type: 'time', half: true },
        { name: 'arriveDate', label: 'Fecha de llegada', type: 'date', half: true },
        { name: 'arriveTime', label: 'Hora de llegada', type: 'time', half: true },
        { name: 'priceCents', label: 'Precio por persona', type: 'money', half: true },
        { name: 'status', label: 'Estado del billete', type: 'select', half: true, options: C.TICKET_STATUS.map((s) => ({ value: s.id, label: s.label })) },
        { name: 'priceEstimated', label: 'El precio es una estimación (no confirmado)', type: 'toggle' },
        { name: 'reference', label: 'N.º de reserva' },
        { name: 'link', label: 'Enlace de la reserva', type: 'url', placeholder: 'https://…' },
        { name: 'ticketLink', label: 'Enlace del billete (PDF, app, wallet…)', type: 'url', placeholder: 'https://…' },
        { name: 'travellers', label: 'Quién viaja', type: 'checkboxes', allToggle: true, options: people.map((p) => ({ value: p.id, label: p.name, color: p.color })) },
        { name: 'confirmed', label: 'Reserva confirmada', type: 'toggle' },
        { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
      ],
      values: t || { type: 'train', status: 'to-book', priceEstimated: true, travellers: store.travellerIds() },
      onSubmit(v) {
        store.upsert('transports', Object.assign({}, t ? { id: t.id } : {}, v));
        ui.toast('Guardado');
      },
      onDelete: t ? () => { store.remove('transports', t.id); ui.toast('Eliminado'); } : null,
    });
  }

  function trHtml() {
    const me = T.app.profileId();
    const mineOnly = S.get('trMine', false) && me;
    const list = store.list('transports')
      .filter((t) => !mineOnly || !t.travellers.length || t.travellers.includes(me))
      .sort((a, b) => (a.date || a.arriveDate || '9').localeCompare(b.date || b.arriveDate || '9') || (a.time || '').localeCompare(b.time || ''));
    const confirmed = list.filter((t) => t.confirmed).length;
    return '<dl class="stat-row">' +
      '<div><dt>Confirmados</dt><dd>' + confirmed + '/' + list.length + '</dd></div>' +
      '<div><dt>Por reservar</dt><dd>' + list.filter((t) => t.status === 'to-book').length + '</dd></div>' +
      '<div><dt>Suma precios p. p.</dt><dd>' + U.fmtEUR(list.reduce((s, t) => s + (t.status !== 'cancelled' ? t.priceCents || 0 : 0), 0)) + '</dd></div></dl>' +
      (me ? '<label class="switch switch--inline"><input type="checkbox" data-action="tr-mine"' + (mineOnly ? ' checked' : '') + '><span class="switch__track"></span><span>Solo mis trayectos</span></label>' : '') +
      '<p class="small muted">Las opciones, duraciones y precios estimados de cada trayecto están en <a href="#route">Ruta → Cronología</a>.</p>' +
      '<div class="booking-grid">' + (list.length ? list.map(trCard).join('') : ui.empty('Todavía no hay transportes.')) + '</div>';
  }

  T.views.planning = {
    render(el) {
      const tab = S.get('planTab', 'acc');
      el.innerHTML = '<section class="page">' +
        '<div class="page__head"><div><p class="kicker">Reservas</p><h2 class="display">Planificación</h2></div><button type="button" class="btn btn--primary btn--sm" data-action="add">+ Añadir</button></div>' +
        ui.segmented([{ id: 'acc', label: 'Alojamiento' }, { id: 'tr', label: 'Transporte y billetes' }], tab, 'plan-tab') +
        (tab === 'acc' ? accHtml() : trHtml()) +
        '</section>';
    },
    onClick(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const id = a.dataset.id;
      switch (a.dataset.action) {
        case 'plan-tab': S.set('planTab', id); T.app.render(); break;
        case 'add': (S.get('planTab', 'acc') === 'acc' ? accForm : trForm)(null); break;
        case 'edit-acc': accForm(store.get('accommodations', id)); break;
        case 'edit-tr': trForm(store.get('transports', id)); break;
        case 'toggle-acc': { const r = store.get('accommodations', id); store.upsert('accommodations', { id, confirmed: !r.confirmed }); break; }
        case 'toggle-tr': {
          const r = store.get('transports', id);
          store.upsert('transports', { id, confirmed: !r.confirmed, status: !r.confirmed && r.status === 'to-book' ? 'booked' : r.status });
          break;
        }
      }
    },
    onChange(e) {
      const a = e.target.closest('[data-action="tr-mine"]');
      if (a) { S.set('trMine', a.checked); T.app.render(); }
    },
  };
})(typeof self !== 'undefined' ? self : this);
