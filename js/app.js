/* Estructura de la app: navegación por hash entre las cinco secciones, cabecera y perfiles. */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C } = T;
  const esc = U.esc;
  const TABS = ['route', 'itinerary', 'expenses', 'planning', 'checklist'];
  const main = document.getElementById('view');
  let current = null;

  const app = (T.app = {
    profileId() { return store.settings.get('profile', ''); },
    profile() { return store.traveller(app.profileId()); },
    render,
    go(tab) { location.hash = '#' + tab; },
    chooseProfile,
    editProfile,
  });

  function tabFromHash() {
    const h = (location.hash || '').replace('#', '');
    return TABS.includes(h) ? h : store.settings.get('tab', 'route');
  }

  function render(opts) {
    const view = T.views[current];
    if (!view) return;
    const keepScroll = !(opts && opts.scrollTop);
    const y = window.scrollY;
    view.render(main);
    if (keepScroll) window.scrollTo(0, y);
    renderHeader();
  }

  function switchTab(tab) {
    if (current && current !== tab && T.views[current] && T.views[current].leave) T.views[current].leave();
    current = tab;
    store.settings.set('tab', tab);
    document.body.dataset.tab = tab;
    document.querySelectorAll('.tabbar a').forEach((a) => {
      const on = a.dataset.tab === tab;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    render({ scrollTop: true });
    window.scrollTo(0, 0);
  }

  function renderHeader() {
    const p = app.profile();
    const btn = document.getElementById('profile-btn');
    btn.innerHTML = p ? ui.avatar(p) + '<span>' + esc(p.name) + '</span>' : '<span>¿Quién eres?</span>';

    const today = U.todayIso();
    const { TRIP_START, TRIP_END } = C;
    let text;
    if (today < TRIP_START) {
      const d = U.nights(today, TRIP_START);
      text = d === 1 ? '¡Mañana nos vemos en Madrid!' : 'Faltan ' + d + ' días · 16 mar – 9 abr';
    } else if (today <= TRIP_END) {
      const day = U.nights(TRIP_START, today) + 1;
      const city = store.cities().find((c) => c.arrive <= today && today < c.depart);
      text = 'Día ' + day + ' de ' + (U.nights(TRIP_START, TRIP_END) + 1) + (city ? ' · ' + store.cityLabel(city) : '');
    } else {
      text = 'Viaje completado · 16 mar – 9 abr 2027';
    }
    document.getElementById('countdown').textContent = text;
  }

  function chooseProfile(firstRun) {
    const cur = app.profileId();
    ui.sheet({
      title: firstRun ? '¡Bienvenida/o! ¿Quién eres?' : 'Elige tu perfil',
      noFocus: true,
      html: '<p class="muted">Tu perfil se usa para los favoritos, como pagador por defecto y para tu equipaje personal. La elección se guarda en este dispositivo.</p>' +
        '<div class="profile-grid">' + store.travellers().map((t) =>
          '<button type="button" class="profile-card' + (t.id === cur ? ' is-active' : '') + '" data-pick="' + esc(t.id) + '">' +
          ui.avatar(t, 'xl') + '<strong>' + esc(t.name) + '</strong><small>desde ' + esc(t.origin) + '</small></button>').join('') +
        '</div>' +
        (cur ? '<div class="row-actions center-row"><button type="button" class="btn" data-edit>✎ Editar mi perfil (nombre y foto)</button></div>' : ''),
      onClick(e, close) {
        if (e.target.closest('[data-edit]')) { close(); editProfile(cur); return; }
        const b = e.target.closest('[data-pick]');
        if (!b) return;
        store.settings.set('profile', b.dataset.pick);
        close();
        render();
        ui.toast('¡Hola, ' + store.travellerName(b.dataset.pick) + '! 👋');
      },
    });
  }

  function editProfile(id) {
    const t = store.traveller(id || app.profileId());
    if (!t) { chooseProfile(false); return; }
    const avatarField = '<fieldset class="field"><legend>Avatar si no hay foto (por defecto, la ilustración)</legend><div class="check-pills">' +
      ['', ...C.AVATARS].map((a) => '<label class="check-pill check-pill--avatar"><input type="radio" name="avatar" value="' + esc(a) + '"' + ((t.avatar || '') === a ? ' checked' : '') + '><span>' + (a ? esc(a) : (ui.hasArt(t) ? ui.avatar(Object.assign({}, t, { photo: '', avatar: '' }), 'sm') + '<small>Ilustración</small>' : esc(t.name.charAt(0)) + ' · inicial')) + '</span></label>').join('') +
      '</div></fieldset>';
    ui.openForm({
      title: 'Perfil de ' + t.name,
      intro: 'La foto se reduce y se guarda dentro de los datos compartidos del viaje: las demás personas la verán cuando importen tu archivo (menú ⋮ → Exportar / Importar → Combinar).',
      fields: [
        { name: 'name', label: 'Nombre del perfil', required: true, maxlength: 30 },
        { name: 'photo', label: 'Tu propia foto o logo (opcional: sustituye al avatar ilustrado)', type: 'image', square: true, maxSize: 400, quality: 0.82 },
        { type: 'html', html: avatarField },
      ],
      values: t,
      onSubmit(v) {
        const form = document.querySelector('.sheet form');
        const avatar = (form.querySelector('input[name=avatar]:checked') || {}).value || '';
        store.updateTraveller(t.id, { name: v.name, photo: v.photo, avatar });
        ui.toast('Perfil actualizado');
      },
    });
  }

  ['click', 'change', 'input', 'submit'].forEach((type) => {
    main.addEventListener(type, (e) => {
      const view = T.views[current];
      const fn = view && view['on' + type.charAt(0).toUpperCase() + type.slice(1)];
      if (fn) fn(e);
    });
  });

  document.getElementById('profile-btn').addEventListener('click', () => chooseProfile(false));
  document.getElementById('menu-btn').addEventListener('click', () => T.views.settings.open());
  window.addEventListener('hashchange', () => switchTab(tabFromHash()));

  const loaded = store.init();
  store.subscribe(() => render());
  switchTab(tabFromHash());
  if (loaded.upgraded) ui.toast('✨ EuroTrip 2027 actualizado: tus gastos y reservas se han conservado.', 5000);
  if (!app.profile()) chooseProfile(true);
})(typeof self !== 'undefined' ? self : this);
