/* Menú de datos: exportar / importar (combinar o reemplazar) / restablecer, y cómo funciona compartir. */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U } = T;
  const esc = U.esc;
  T.views = T.views || {};

  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  function fileName() {
    const p = T.app.profile();
    return 'eurotrip-2027-' + (p ? slug(p.name) + '-' : '') + U.todayIso() + '.json';
  }

  function exportData(share) {
    const p = T.app.profile();
    const json = JSON.stringify(store.exportPayload(p ? p.name : ''), null, 1);
    const blob = new Blob([json], { type: 'application/json' });
    const file = typeof File === 'function' ? new File([blob], fileName(), { type: 'application/json' }) : null;
    if (share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Datos de EuroTrip 2027' }).catch(() => { /* cancelado */ });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    ui.toast('Datos del viaje exportados ⬇');
  }

  function handleImportFile(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { ui.toast('El archivo es demasiado grande para ser datos del viaje.'); return; }
    const reader = new FileReader();
    reader.onerror = () => ui.toast('No se pudo leer el archivo.');
    reader.onload = () => {
      let obj;
      try { obj = JSON.parse(reader.result); } catch (e) {
        showImportResult({ ok: false, errors: ['No es un archivo JSON válido.'], warnings: [] });
        return;
      }
      showImportResult(store.validate(obj), obj);
    };
    reader.readAsText(file);
  }

  function showImportResult(v, obj) {
    if (!v.ok) {
      ui.sheet({
        title: 'No se pudo importar',
        html: '<p>No se ha cambiado nada. El archivo tiene problemas:</p><ul class="errors">' + v.errors.slice(0, 12).map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' +
          '<div class="form__actions"><span></span><button type="button" class="btn btn--primary" data-close>Aceptar</button></div>',
      });
      return;
    }
    const from = obj.exportedBy ? ' de <b>' + esc(obj.exportedBy) + '</b>' : '';
    const when = obj.exportedAt ? ' (exportado el ' + esc(new Date(obj.exportedAt).toLocaleString('es-ES')) + ')' : '';
    ui.sheet({
      title: 'Importar datos del viaje',
      noFocus: true,
      html: '<p>✅ Archivo válido' + from + when + '.</p><p class="muted small">Contiene: ' + esc(v.summary) + '.</p>' +
        (v.warnings.length ? '<ul class="warnings">' + v.warnings.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '') +
        '<div class="choice-cards">' +
        '<button type="button" class="choice-card" data-mode="merge"><strong>Combinar (recomendado)</strong><span>Une el archivo con los datos de este teléfono: gana la versión editada más recientemente, se aplican los borrados y se conservan los favoritos y las fotos de perfil de todos.</span></button>' +
        '<button type="button" class="choice-card choice-card--danger" data-mode="replace"><strong>Reemplazar todo</strong><span>Descarta los datos de este teléfono y usa los del archivo.</span></button>' +
        '</div>' +
        '<p class="muted small">Consejo: exporta antes tus propios datos como copia de seguridad.</p>',
      onClick(e, close) {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        if (b.dataset.mode === 'merge') {
          const s = store.mergeWith(obj);
          close();
          ui.toast('Combinado: ' + s.added + ' nuevos, ' + s.updated + ' actualizados, ' + s.removed + ' eliminados', 4500);
        } else {
          ui.confirm('¿Reemplazar TODOS los datos del viaje en este teléfono por los del archivo? Se perderán los datos actuales.', { okLabel: 'Reemplazar', danger: true }).then((ok) => {
            if (!ok) return;
            store.replaceWith(obj);
            close();
            ui.toast('Datos reemplazados desde el archivo');
          });
        }
      },
    });
  }

  function open() {
    const p = T.app.profile();
    const doc = store.doc;
    const kb = store.sizeKB();
    ui.sheet({
      title: 'Datos del viaje',
      noFocus: true,
      html:
        '<div class="settings-block"><h3>Tu perfil</h3>' +
        '<p class="profile-line">' + (p ? ui.avatar(p, 'lg') + '<span>Eres <b>' + esc(p.name) + '</b></span>' : 'Sin perfil elegido') + '</p>' +
        '<div class="row-actions"><button type="button" class="btn btn--sm" data-act="edit-profile">✎ Editar nombre y foto</button><button type="button" class="link-btn" data-act="profile">Cambiar de perfil</button></div></div>' +

        '<div class="settings-block"><h3>Compartir y sincronizar</h3>' +
        '<p class="small">EuroTrip 2027 no usa servidor ni cuentas: todo se guarda <b>en este navegador</b>. Para que las cuatro personas vean lo mismo (gastos, favoritos, reservas, listas y <b>fotos de perfil</b>):</p>' +
        '<ol class="small steps"><li>Cada persona pulsa <b>Exportar</b> y envía el archivo al grupo.</li><li>Cada persona pulsa <b>Importar → Combinar</b> con los archivos de las demás.</li><li>Listo: todo el mundo tiene los mismos datos.</li></ol>' +
        '<div class="btn-stack">' +
        '<button type="button" class="btn btn--primary" data-act="export">⬇ Exportar datos del viaje (.json)</button>' +
        (navigator.canShare ? '<button type="button" class="btn" data-act="share">Compartir archivo (WhatsApp, correo…)</button>' : '') +
        '<label class="btn">⬆ Importar datos del viaje<input type="file" accept="application/json,.json" data-act="import" hidden></label>' +
        '</div></div>' +

        '<div class="settings-block"><h3>Almacenamiento</h3>' +
        '<p class="muted small">Último cambio: ' + esc(new Date(doc.updatedAt).toLocaleString('es-ES')) + ' · ' + kb.toLocaleString('es-ES') + ' KB usados · ' +
        doc.expenses.length + ' gastos, ' + doc.activities.length + ' actividades.</p>' +
        (kb > 3500 ? '<p class="warnings small">⚠️ Los datos ocupan mucho (fotos subidas). El navegador suele permitir unos 5 MB: usen enlaces de imagen en lugar de subir fotos.</p>' : '') +
        '<p class="muted small">Si borran los datos del navegador se pierde el viaje: exporten una copia de vez en cuando. No guarden contraseñas ni números de pasaporte.</p>' +
        '<button type="button" class="btn btn--danger-ghost" data-act="reset">Restablecer todo al plan original</button></div>' +

        '<p class="muted small center">EuroTrip 2027 · gratuito y sin servidores · formato de datos v' + store.SCHEMA_VERSION + '</p>',
      onMount(body, close) {
        const input = body.querySelector('input[data-act="import"]');
        input.addEventListener('change', () => { const f = input.files[0]; close(); handleImportFile(f); });
      },
      onClick(e, close) {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        switch (b.dataset.act) {
          case 'profile': close(); T.app.chooseProfile(false); break;
          case 'edit-profile': close(); T.app.editProfile(); break;
          case 'export': exportData(false); break;
          case 'share': exportData(true); break;
          case 'reset':
            ui.confirm('¿Borrar TODOS los gastos, favoritos, reservas, notas y cambios de este dispositivo y volver al plan original? Exporta antes una copia si no estás segura/o.', { okLabel: 'Restablecer todo', danger: true, title: 'Restablecer datos' })
              .then((ok) => { if (ok) { store.reset(); close(); ui.toast('Datos restablecidos al plan original'); } });
            break;
        }
      },
    });
  }

  T.views.settings = { open, exportData, handleImportFile };
})(typeof self !== 'undefined' ? self : this);
