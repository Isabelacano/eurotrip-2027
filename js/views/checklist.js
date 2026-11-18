/* PESTAÑA 5 — LISTA: documentos, equipaje, antes del viaje, pendientes de reserva, personal, compras, recordatorios y notas. */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C } = T;
  const esc = U.esc;
  T.views = T.views || {};
  const S = store.settings;

  function itemHtml(it) {
    return '<li class="check' + (it.done ? ' is-done' : '') + '">' +
      '<label><input type="checkbox" data-action="toggle" data-id="' + esc(it.id) + '"' + (it.done ? ' checked' : '') + '>' +
      '<span>' + esc(it.text) + '</span></label>' +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="edit-item" data-id="' + esc(it.id) + '" aria-label="Editar tarea">✎</button></li>';
  }

  function pendingBookingsHtml() {
    const acc = store.list('accommodations').filter(store.variantVisible).filter((a) => !a.confirmed);
    const tr = store.list('transports').filter((t) => !t.confirmed && t.status !== 'cancelled');
    if (!acc.length && !tr.length) return '<p class="muted small pad">✓ Todas las reservas de Planificación están confirmadas.</p>';
    return '<div class="auto-pending"><p class="kicker">Desde Planificación · sin confirmar</p><ul>' +
      acc.map((a) => '<li>🛏️ ' + esc(store.cityLabelById(a.cityId)) + ': ' + esc(a.name) + '</li>').join('') +
      tr.map((t) => '<li>' + C.icon(C.MODES, t.type) + ' ' + esc(t.from) + ' → ' + esc(t.to) + (t.date ? ' (' + esc(U.fmtDate(t.date)) + ')' : '') + '</li>').join('') +
      '</ul><a href="#planning" class="link-btn">Abrir Planificación →</a></div>';
  }

  function sectionHtml(list, items, extra, idx) {
    const done = items.filter((i) => i.done).length;
    const open = S.get('chkOpen-' + list.id, true);
    const sorted = items.slice().sort((a, b) => Number(a.done) - Number(b.done));
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    return '<section class="section' + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="section__head" data-action="toggle-section" data-id="' + list.id + '" aria-expanded="' + open + '">' +
      '<span class="section__num">' + String(idx + 1).padStart(2, '0') + '</span>' +
      '<span class="section__title">' + esc(list.label) + '</span>' +
      '<span class="section__count">' + done + '/' + items.length + ' <span class="chev" aria-hidden="true">▾</span></span>' +
      '<span class="section__bar" style="--p:' + pct + '%"></span></button>' +
      (open ? '<div class="section__body">' + (extra || '') +
        '<ul class="checks">' + sorted.map(itemHtml).join('') + '</ul>' +
        '<form class="add-row" data-add="' + list.id + '"><input name="text" placeholder="' + (list.id === 'reservations' ? 'Añadir reserva pendiente…' : 'Añadir…') + '" aria-label="Nueva tarea en ' + esc(list.label) + '" autocomplete="off"><button type="submit" class="btn btn--sm btn--primary">Añadir</button></form>' +
        '</div>' : '') +
      '</section>';
  }

  function notesHtml() {
    const notes = store.list('notes').slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return ui.rule('Notas, enlaces y recomendaciones', '<button type="button" class="btn btn--sm" data-action="add-note">+ Nota</button>') +
      (notes.length ? '<div class="notes-grid">' + notes.map((n, i) =>
        '<article class="note-card' + (i % 3 === 0 ? ' note-card--accent' : '') + '" data-action="edit-note" data-id="' + esc(n.id) + '">' +
        '<h4 class="serif">' + esc(n.title || 'Sin título') + '</h4>' +
        (n.body ? '<p class="pre">' + esc(n.body) + '</p>' : '') +
        (n.url ? '<p>' + ui.extLink(n.url, '↗ ' + esc(n.url.replace(/^https?:\/\//, '').slice(0, 48))) + '</p>' : '') +
        '</article>').join('') + '</div>' : ui.empty('Todavía no hay notas.'));
  }

  function itemForm(it) {
    ui.openForm({
      title: 'Editar tarea',
      fields: [
        { name: 'text', label: 'Tarea', required: true },
        { name: 'list', label: 'Sección de la checklist', type: 'select', options: C.CHECK_LISTS.map((l) => ({ value: l.id, label: l.label })) },
        { name: 'owner', label: 'Persona (para equipaje personal)', type: 'select', options: [{ value: '', label: '—' }].concat(store.travellers().map((t) => ({ value: t.id, label: t.name }))) },
        { name: 'done', label: 'Completada', type: 'toggle' },
      ],
      values: it,
      onSubmit(v) {
        if (v.list === 'personal' && !v.owner) return 'Elige la persona para una tarea personal.';
        if (v.list !== 'personal') v.owner = '';
        store.upsert('checklist', Object.assign({ id: it.id }, v));
      },
      onDelete: () => { store.remove('checklist', it.id); ui.toast('Tarea eliminada'); },
    });
  }

  function noteForm(n) {
    ui.openForm({
      title: n ? 'Editar nota' : 'Nueva nota',
      fields: [
        { name: 'title', label: 'Título', required: true },
        { name: 'body', label: 'Texto', type: 'textarea', rows: 6 },
        { name: 'url', label: 'Enlace', type: 'url', placeholder: 'https://…' },
      ],
      values: n || {},
      onSubmit(v) { store.upsert('notes', Object.assign({}, n ? { id: n.id } : {}, v)); ui.toast('Nota guardada'); },
      onDelete: n ? () => { store.remove('notes', n.id); ui.toast('Nota eliminada'); } : null,
    });
  }

  T.views.checklist = {
    render(el) {
      const items = store.list('checklist');
      const me = T.app.profileId();
      const owner = S.get('chkOwner', '') || me || store.travellerIds()[0];
      const total = items.length;
      const done = items.filter((i) => i.done).length;
      const pct = total ? Math.round((done / total) * 100) : 0;

      const personalPicker = '<div class="chips chips--compact" role="group" aria-label="Equipaje personal de">' + store.travellers().map((t) =>
        '<button type="button" class="chip' + (t.id === owner ? ' is-active' : '') + '" data-action="owner" data-id="' + esc(t.id) + '" aria-pressed="' + (t.id === owner) + '">' + ui.avatar(t, 'xs') + ' ' + esc(t.name) + '</button>').join('') + '</div>';

      el.innerHTML = '<section class="page">' +
        '<div class="page__head"><div><p class="kicker">Antes de salir</p><h2 class="display">Checklist</h2></div>' +
        '<div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span></div></div>' +
        '<p class="serif lede-sm">' + done + ' de ' + total + ' tareas completadas.</p>' +
        C.CHECK_LISTS.map((list, i) => {
          if (list.id === 'personal') return sectionHtml(Object.assign({}, list, { label: 'Equipaje personal · ' + store.travellerName(owner) }), items.filter((x) => x.list === 'personal' && x.owner === owner), personalPicker, i);
          if (list.id === 'reservations') return sectionHtml(list, items.filter((x) => x.list === list.id), pendingBookingsHtml(), i);
          return sectionHtml(list, items.filter((x) => x.list === list.id), '', i);
        }).join('') +
        notesHtml() +
        '<p class="muted small center">Se guarda en este dispositivo; compártanlo con Exportar / Importar (menú ⋮).</p>' +
        '</section>';
    },
    onClick(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const id = a.dataset.id;
      switch (a.dataset.action) {
        case 'toggle-section': S.set('chkOpen-' + id, !S.get('chkOpen-' + id, true)); T.app.render(); break;
        case 'owner': S.set('chkOwner', id); T.app.render(); break;
        case 'edit-item': itemForm(store.get('checklist', id)); break;
        case 'add-note': noteForm(null); break;
        case 'edit-note': if (!e.target.closest('a')) noteForm(store.get('notes', id)); break;
      }
    },
    onChange(e) {
      const a = e.target.closest('[data-action="toggle"]');
      if (!a) return;
      const it = store.get('checklist', a.dataset.id);
      if (it) store.upsert('checklist', { id: it.id, done: a.checked });
    },
    onSubmit(e) {
      const form = e.target.closest('form[data-add]');
      if (!form) return;
      e.preventDefault();
      const text = form.elements.text.value.trim();
      if (!text) return;
      const list = form.dataset.add;
      const owner = list === 'personal' ? (S.get('chkOwner', '') || T.app.profileId() || store.travellerIds()[0]) : '';
      store.upsert('checklist', { list, owner, text, done: false });
      requestAnimationFrame(() => {
        const again = document.querySelector('form[data-add="' + list + '"] input');
        if (again) again.focus();
      });
    },
  };
})(typeof self !== 'undefined' ? self : this);
