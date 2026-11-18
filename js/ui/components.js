/* Componentes reutilizables: hojas inferiores, formularios, confirmaciones, avisos, avatares e imágenes. */
(function (root) {
  const T = (root.Trip = root.Trip || {});
  const U = T.utils;
  const esc = U.esc;
  const isTouch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  let openCount = 0;

  /** Hoja inferior (pantalla completa en móvil, diálogo centrado en escritorio). */
  function sheet(opts) {
    const rootEl = document.getElementById('sheet-root');
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML =
      '<div class="sheet' + (opts.wide ? ' sheet--wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || '') + '">' +
      '<div class="sheet__handle" aria-hidden="true"></div>' +
      '<header class="sheet__head"><h2>' + esc(opts.title || '') + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></header>' +
      '<div class="sheet__body">' + (opts.html || '') + '</div></div>';
    rootEl.appendChild(wrap);
    openCount++;
    document.body.classList.add('no-scroll');
    const previouslyFocused = document.activeElement;
    const body = wrap.querySelector('.sheet__body');

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      wrap.classList.add('is-closing');
      setTimeout(() => wrap.remove(), 160);
      openCount--;
      if (!openCount) document.body.classList.remove('no-scroll');
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus({ preventScroll: true });
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) { close(); return; }
      if (opts.onClick) opts.onClick(e, close);
    });
    if (opts.onInput) { wrap.addEventListener('input', opts.onInput); wrap.addEventListener('change', opts.onInput); }
    requestAnimationFrame(() => wrap.classList.add('is-open'));
    if (opts.onMount) opts.onMount(body, close);
    if (!isTouch() && !opts.noFocus) {
      const first = body.querySelector('input:not([type=checkbox]):not([type=hidden]):not([type=file]), textarea, select');
      if (first) first.focus({ preventScroll: true });
    }
    return close;
  }

  /* ---------------- Imágenes ---------------- */

  /**
   * Reduce una imagen del dispositivo a JPEG comprimido (dataURL).
   * square=true recorta al centro (fotos de perfil).
   */
  function readImageFile(file, maxSize, quality, square) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('El archivo no es una imagen.')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('La imagen es demasiado grande (máx. 25 MB).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
        const scale = Math.min(1, maxSize / Math.max(sw, sh));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  /*
   * Fotos de Wikimedia en alta resolución: Wikimedia solo sirve miniaturas en anchos estándar
   * (330, 500, 960, 1280, 1920 px) y nunca más anchas que el original, así que se genera un srcset
   * con los anchos válidos y el navegador elige según el tamaño real en pantalla.
   */
  const WIDTHS = [500, 960, 1280, 1920];
  let wikiIndex = null;
  const THUMB_RE = /^(https:\/\/[^?#]+\/thumb\/[^?#]+?)\/(\d+)px-([^/?#]+)/;
  function wikiInfo(src) {
    const m = src && src.match(THUMB_RE);
    if (!m) return null;
    if (!wikiIndex) {
      wikiIndex = {};
      Object.values(T.images || {}).forEach((i) => { if (i.t) wikiIndex[i.t.split('/{w}px-')[0]] = i.w || 960; });
    }
    return { prefix: m[1], file: m[3], max: wikiIndex[m[1]] || 960 };
  }
  function srcFor(src, width) {
    const w = wikiInfo(src);
    if (!w) return src;
    const best = WIDTHS.filter((x) => x <= w.max).filter((x) => x <= width).pop() || 500;
    return w.prefix + '/' + best + 'px-' + w.file;
  }
  /** Miniatura de Wikimedia a 1280 px (o el máximo disponible) para portadas. */
  const heroSrc = (src) => srcFor(src, 1280);
  const SIZES = {
    hero: '100vw',
    card: '(min-width: 1000px) 380px, (min-width: 640px) 50vw, 100vw',
    thumb: '120px',
  };

  /**
   * Foto en blanco y negro con marcador elegante si falta o falla.
   * o: { cls, label, kicker, credit, eager, hero, sizes, thumb }
   */
  function photo(src, o) {
    o = o || {};
    const safe = src && (src.startsWith('data:image/') ? src : U.safeUrl(src));
    const w = safe && wikiInfo(safe);
    let img = '';
    if (safe) {
      let attrs = '';
      let main = safe;
      if (w) {
        const set = WIDTHS.filter((x) => x <= w.max);
        if (o.thumb) main = w.prefix + '/330px-' + w.file;
        else {
          main = srcFor(safe, o.hero ? 1280 : 960);
          attrs = ' srcset="' + esc(set.map((x) => w.prefix + '/' + x + 'px-' + w.file + ' ' + x + 'w').join(', ')) + '" sizes="' + esc(o.sizes || (o.hero ? SIZES.hero : SIZES.card)) + '"';
        }
      }
      img = '<img src="' + esc(main) + '"' + attrs + ' alt="' + esc(o.alt || o.label || '') + '"' + (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') +
        ' decoding="async" referrerpolicy="no-referrer" onload="this.parentNode.classList.add(\'is-loaded\')" onerror="this.remove()">';
    }
    return '<figure class="ph ' + (o.cls || '') + '">' +
      '<span class="ph__fallback" aria-hidden="true"><span class="ph__kicker">' + esc(o.kicker || 'EuroTrip 2027') + '</span><span class="ph__label">' + esc(o.label || '') + '</span></span>' +
      img +
      (o.credit && U.safeUrl(o.credit) ? '<a class="ph__credit" href="' + esc(U.safeUrl(o.credit)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(o.creditTitle || 'Foto: ver autoría y licencia') + '">' + esc(o.creditLabel || 'Foto · Wikimedia Commons') + '</a>' : '') +
      '</figure>';
  }

  /* ---------------- Formularios ---------------- */
  function fieldHtml(f, value) {
    const id = 'f-' + f.name;
    const req = f.required ? ' required' : '';
    const ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
    const cls = 'field' + (f.half ? ' field--half' : '');
    const lbl = '<label for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>';
    const hint = f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '';
    let input = '';
    switch (f.type) {
      case 'textarea':
        input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + ph + req + '>' + esc(value) + '</textarea>';
        break;
      case 'select':
        input = '<select id="' + id + '" name="' + f.name + '"' + req + '>' +
          (f.options || []).map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(value == null ? '' : value) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
          '</select>';
        break;
      case 'checkboxes': {
        const vals = Array.isArray(value) ? value : [];
        return '<fieldset class="' + cls + '"><legend>' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</legend>' +
          (f.allToggle ? '<button type="button" class="link-btn" data-check-all="' + f.name + '">Seleccionar todos</button>' : '') +
          '<div class="check-pills">' +
          (f.options || []).map((o) => '<label class="check-pill"' + (o.color ? ' style="--c:' + esc(o.color) + '"' : '') + '><input type="checkbox" name="' + f.name + '" value="' + esc(o.value) + '"' + (vals.includes(o.value) ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>').join('') +
          '</div>' + hint + '</fieldset>';
      }
      case 'toggle':
        return '<div class="' + cls + ' field--toggle"><label class="switch"><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (value ? ' checked' : '') + '><span class="switch__track"></span><span>' + esc(f.label) + '</span></label>' + hint + '</div>';
      case 'money':
        input = '<div class="money-input"><input id="' + id + '" name="' + f.name + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(value == null ? '' : U.centsToInput(value)) + '"' + ph + req + '><span>€</span></div>';
        break;
      case 'number':
        input = '<input id="' + id + '" name="' + f.name + '" type="number" inputmode="numeric" min="' + (f.min == null ? 0 : f.min) + '" step="1" value="' + esc(value == null ? '' : value) + '"' + req + '>';
        break;
      case 'image': {
        const v = value || '';
        const isData = v.startsWith('data:');
        return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + '</label>' +
          '<div class="img-field" data-img-field="' + f.name + '">' +
          '<div class="img-field__preview">' + (v ? '<img src="' + esc(v) + '" alt="">' : '<span>Sin foto</span>') + '</div>' +
          '<div class="img-field__controls">' +
          '<input id="' + id + '" type="url" inputmode="url" autocapitalize="off" placeholder="Pegar enlace de imagen (https://…)" data-img-url value="' + esc(isData ? '' : v) + '">' +
          '<div class="row-actions"><label class="btn btn--sm">📷 Subir foto<input type="file" accept="image/*" data-img-file hidden></label>' +
          '<button type="button" class="link-btn" data-img-clear>Quitar</button></div>' +
          '</div><input type="hidden" name="' + f.name + '" value="' + esc(v) + '"></div>' + hint + '</div>';
      }
      default: {
        const type = { url: 'url', date: 'date', time: 'time' }[f.type] || 'text';
        const extra = f.type === 'date' ? ' min="2026-01-01" max="2028-12-31"' : '';
        input = '<input id="' + id + '" name="' + f.name + '" type="' + type + '" value="' + esc(value == null ? '' : value) + '"' + ph + req + extra +
          (f.type === 'url' ? ' inputmode="url" autocapitalize="off"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + '>';
      }
    }
    return '<div class="' + cls + '">' + lbl + input + hint + '</div>';
  }

  function readForm(form, fields) {
    const values = {};
    let error = null;
    fields.forEach((f) => {
      if (f.type === 'html') return;
      if (f.type === 'checkboxes') {
        values[f.name] = Array.from(form.querySelectorAll('input[name="' + f.name + '"]:checked')).map((i) => i.value);
        if (f.required && !values[f.name].length && !error) error = 'Elijan al menos una opción en "' + f.label + '".';
        return;
      }
      const el = form.elements[f.name];
      if (!el) return;
      if (f.type === 'toggle') { values[f.name] = el.checked; return; }
      const raw = el.value.trim();
      if (f.type === 'money') {
        if (!raw) values[f.name] = null;
        else {
          const c = U.toCents(raw);
          if (Number.isNaN(c) && !error) error = '"' + f.label + '" no es un importe válido en euros (p. ej. 12,50).';
          values[f.name] = Number.isNaN(c) ? null : c;
        }
      } else if (f.type === 'number') {
        values[f.name] = raw === '' ? null : parseInt(raw, 10);
      } else if (f.type === 'url') {
        if (raw && !U.safeUrl(raw) && !error) error = '"' + f.label + '" debe ser un enlace web que empiece por http(s)://';
        values[f.name] = raw ? U.safeUrl(raw) : '';
      } else if (f.type === 'image') {
        if (raw && !raw.startsWith('data:image/') && !U.safeUrl(raw) && !error) error = 'La imagen debe ser un enlace web (https://…) o una foto subida.';
        values[f.name] = raw.startsWith('data:image/') ? raw : U.safeUrl(raw);
      } else {
        values[f.name] = raw;
      }
      if (f.required && (values[f.name] === '' || values[f.name] == null) && !error) error = '"' + f.label + '" es obligatorio.';
    });
    return { values, error };
  }

  /**
   * opts: { title, fields, values, submitLabel, onSubmit(values) -> error|void,
   *         onDelete(), deleteLabel, preview(values) -> html, intro, onFieldInput(event, formEl) }
   */
  function openForm(opts) {
    const values = opts.values || {};
    const html =
      '<form class="form" novalidate>' +
      (opts.intro ? '<p class="form__intro">' + opts.intro + '</p>' : '') +
      '<div class="form__grid">' +
      opts.fields.map((f) => (f.type === 'html' ? f.html : fieldHtml(f, values[f.name]))).join('') +
      '</div>' +
      (opts.preview ? '<div class="form__preview" data-preview></div>' : '') +
      '<p class="form__error" role="alert" hidden></p>' +
      '<div class="form__actions">' +
      (opts.onDelete ? '<button type="button" class="btn btn--danger-ghost" data-delete>' + esc(opts.deleteLabel || 'Eliminar') + '</button>' : '<span></span>') +
      '<button type="submit" class="btn btn--primary">' + esc(opts.submitLabel || 'Guardar') + '</button>' +
      '</div></form>';

    let formEl;
    const refreshPreview = () => {
      if (!opts.preview || !formEl) return;
      const { values: v } = readForm(formEl, opts.fields);
      formEl.querySelector('[data-preview]').innerHTML = opts.preview(v) || '';
    };
    const setImage = (wrap, value) => {
      wrap.querySelector('input[type=hidden]').value = value || '';
      wrap.querySelector('.img-field__preview').innerHTML = value ? '<img src="' + esc(value) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{textContent:\'No se puede cargar\'}))">' : '<span>Sin foto</span>';
    };

    return sheet({
      title: opts.title,
      html,
      onInput(e) {
        const imgUrl = e.target.closest && e.target.closest('[data-img-url]');
        if (imgUrl && e.type === 'input') setImage(imgUrl.closest('[data-img-field]'), U.safeUrl(imgUrl.value.trim()));
        const imgFile = e.target.closest && e.target.closest('[data-img-file]');
        if (imgFile && e.type === 'change' && imgFile.files[0]) {
          const wrap = imgFile.closest('[data-img-field]');
          const f = opts.fields.find((x) => x.name === wrap.dataset.imgField) || {};
          readImageFile(imgFile.files[0], f.maxSize || 800, f.quality || 0.72, !!f.square)
            .then((data) => { setImage(wrap, data); wrap.querySelector('[data-img-url]').value = ''; refreshPreview(); })
            .catch((err) => toast(err.message));
        }
        if (opts.onFieldInput && formEl && e.target.form === formEl) opts.onFieldInput(e, formEl);
        refreshPreview();
      },
      onMount(body, close) {
        formEl = body.querySelector('form');
        refreshPreview();
        formEl.addEventListener('submit', (e) => {
          e.preventDefault();
          const { values: v, error } = readForm(formEl, opts.fields);
          const err = error || (opts.onSubmit ? opts.onSubmit(v) : null);
          const errEl = formEl.querySelector('.form__error');
          if (err) { errEl.textContent = err; errEl.hidden = false; errEl.scrollIntoView({ block: 'nearest' }); return; }
          close();
        });
      },
      onClick(e, close) {
        if (opts.onFormClick && formEl) {
          const api = {
            form: formEl,
            setImage(name, value) {
              const wrap = formEl.querySelector('[data-img-field="' + name + '"]');
              if (!wrap) return;
              setImage(wrap, value);
              wrap.querySelector('[data-img-url]').value = value && !value.startsWith('data:') ? value : '';
            },
            refresh: refreshPreview,
          };
          if (opts.onFormClick(e, api) === false) return;
        }
        const clear = e.target.closest('[data-img-clear]');
        if (clear) {
          const wrap = clear.closest('[data-img-field]');
          setImage(wrap, '');
          wrap.querySelector('[data-img-url]').value = '';
          return;
        }
        const all = e.target.closest('[data-check-all]');
        if (all) {
          const boxes = formEl.querySelectorAll('input[name="' + all.dataset.checkAll + '"]');
          const allOn = Array.from(boxes).every((b) => b.checked);
          boxes.forEach((b) => { b.checked = !allOn; });
          refreshPreview();
          return;
        }
        if (e.target.closest('[data-delete]')) {
          confirm('¿Eliminar este elemento? No se puede deshacer.', { okLabel: 'Eliminar', danger: true }).then((ok) => {
            if (ok) { opts.onDelete(); close(); }
          });
        }
      },
    });
  }

  function confirm(message, o) {
    o = o || {};
    return new Promise((resolve) => {
      let answered = false;
      sheet({
        title: o.title || '¿Seguro?',
        noFocus: true,
        html: '<p class="confirm__msg">' + esc(message) + '</p>' +
          '<div class="form__actions"><button type="button" class="btn" data-no>Cancelar</button>' +
          '<button type="button" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" data-yes>' + esc(o.okLabel || 'Aceptar') + '</button></div>',
        onClick(e, close) {
          if (e.target.closest('[data-yes]')) { answered = true; resolve(true); close(); }
          if (e.target.closest('[data-no]')) { answered = true; resolve(false); close(); }
        },
        onClose() { if (!answered) resolve(false); },
      });
    });
  }

  let toastTimer;
  function toast(message, ms) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), ms || 2600);
  }

  /** Avatar: foto (si existe), emoji elegido o inicial, con el color de la persona. */
  // Avatares ilustrados por defecto (assets/avatars, generados con tools/make-avatars.py).
  // Prioridad: foto subida por la persona > emoji elegido > ilustración > inicial.
  const DEFAULT_AVATARS = { isa: 'assets/avatars/isa.svg', pili: 'assets/avatars/pili.svg', lenva: 'assets/avatars/lenva.svg', pastu: 'assets/avatars/pastu.svg' };
  function avatar(t, size) {
    if (!t) return '';
    const cls = 'avatar' + (size ? ' avatar--' + size : '');
    const style = ' style="--c:' + esc(t.color) + '" title="' + esc(t.name) + '"';
    if (!t.photo && !t.avatar && DEFAULT_AVATARS[t.id]) {
      return '<span class="' + cls + ' avatar--art"' + style + '>' + esc(t.name.charAt(0)) + '<img src="' + DEFAULT_AVATARS[t.id] + '" alt="' + esc(t.name) + '" onerror="this.remove()"></span>';
    }
    if (t.photo) return '<span class="' + cls + ' avatar--photo"' + style + '>' + esc(t.avatar || t.name.charAt(0)) + '<img src="' + esc(t.photo) + '" alt="' + esc(t.name) + '" onerror="this.remove()"></span>';
    return '<span class="' + cls + '"' + style + '>' + esc(t.avatar || t.name.charAt(0)) + '</span>';
  }

  function empty(message, actionHtml) {
    return '<div class="empty"><p>' + message + '</p>' + (actionHtml || '') + '</div>';
  }

  function segmented(items, active, action, extraAttrs) {
    return '<div class="segmented" role="tablist">' + items.map((it) =>
      '<button type="button" role="tab" aria-selected="' + (it.id === active) + '" class="' + (it.id === active ? 'is-active' : '') + '" data-action="' + action + '" data-id="' + esc(it.id) + '"' + (extraAttrs || '') + '>' + esc(it.label) + '</button>'
    ).join('') + '</div>';
  }

  function extLink(url, text, cls) {
    const safe = U.safeUrl(url);
    if (!safe) return '';
    return '<a class="' + (cls || 'ext') + '" href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
  }

  /** Encabezado editorial: TÍTULO EN MAYÚSCULAS ——— */
  function rule(title, right) {
    return '<div class="rule"><h3>' + esc(title) + '</h3><span class="rule__line"></span>' + (right || '') + '</div>';
  }

  T.ui = { sheet, openForm, confirm, toast, avatar, hasArt: (t) => !!(t && DEFAULT_AVATARS[t.id]), empty, segmented, extLink, photo, heroSrc, readImageFile, rule };
})(typeof self !== 'undefined' ? self : this);
