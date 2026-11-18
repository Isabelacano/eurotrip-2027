/*
 * PESTAÑA 3 — GASTOS: historial tipo Splitwise, tabla tipo Excel, saldos y "quién debe a quién".
 * La lógica de cálculo vive en js/core/finance.js y NO ha cambiado; aquí solo hay interfaz.
 */
(function (root) {
  const T = root.Trip;
  const { store, ui, utils: U, constants: C, finance: F } = T;
  const esc = U.esc;
  T.views = T.views || {};
  const S = store.settings;

  const name = (id) => store.travellerName(id);
  const av = (id, size) => ui.avatar(store.traveller(id), size);
  const catIcon = (id) => C.icon(C.EXPENSE_CATEGORIES, id) || '📦';

  function cityForDate(date) {
    const c = store.cities().find((x) => x.arrive <= date && date < x.depart);
    return c ? c.id : '';
  }

  function filtered() {
    const cityF = S.get('expCity', 'all');
    const personF = S.get('expPerson', 'all');
    return store.list('expenses').filter((e) =>
      (cityF === 'all' || e.cityId === cityF || (cityF === 'none' && !e.cityId)) &&
      (personF === 'all' || e.paidBy === personF || e.participants.includes(personF)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function balanceClass(c) { return c > 0 ? 'pos' : c < 0 ? 'neg' : 'zero'; }
  function signed(c) { return (c > 0 ? '+' : c < 0 ? '−' : '') + U.fmtEUR(Math.abs(c)); }

  /* ---------- Resumen ---------- */
  function summaryHtml(sum) {
    const me = T.app.profileId();
    const mine = sum.people[me];
    let meLine = '';
    if (mine) {
      meLine = mine.balance > 0 ? 'Te deben <b>' + U.fmtEUR(mine.balance) + '</b>'
        : mine.balance < 0 ? 'Debes <b>' + U.fmtEUR(-mine.balance) + '</b>' : 'Estás al día ✓';
    }
    return '<section class="band">' +
      '<div class="band__main"><p class="kicker kicker--light">Gasto del grupo</p>' +
      '<p class="band__big">' + U.fmtEUR(sum.groupTotal) + '</p>' +
      '<p class="serif band__sub">' + sum.count + ' gasto' + (sum.count === 1 ? '' : 's') + ' · media de ' + U.fmtEUR(Math.round(sum.groupTotal / Math.max(1, store.travellers().length))) + ' por persona</p></div>' +
      (mine ? '<div class="band__me">' + av(me, 'lg') + '<p>' + meLine + '</p></div>' : '') +
      '</section>';
  }

  /* ---------- Historial ---------- */
  function expenseRow(e) {
    const me = T.app.profileId();
    const shares = F.expenseShares(e, store.travellerIds());
    const city = e.cityId ? store.cityLabelById(e.cityId) : '';
    const isSettle = e.category === F.SETTLEMENT;
    const everyone = e.participants.length === store.travellers().length;
    let mineLine = '';
    if (!isSettle && me && (shares[me] != null || e.paidBy === me)) {
      const bal = (e.paidBy === me ? e.amountCents : 0) - (shares[me] || 0);
      mineLine = bal > 0 ? '<span class="pos small">prestaste ' + U.fmtEUR(bal) + '</span>' : bal < 0 ? '<span class="neg small">debes ' + U.fmtEUR(-bal) + '</span>' : '';
    }
    return '<button type="button" class="expense" data-action="edit-expense" data-id="' + esc(e.id) + '">' +
      '<span class="expense__icon" aria-hidden="true">' + catIcon(e.category) + '</span>' +
      '<span class="expense__main">' +
      '<span class="expense__title">' + esc(isSettle ? name(e.paidBy) + ' devolvió dinero a ' + name(e.participants[0]) : e.description) + '</span>' +
      '<span class="muted small">' + (isSettle ? 'Reembolso' : 'Pagó ' + esc(name(e.paidBy))) + (city ? ' · ' + esc(city) : '') + '</span>' +
      (isSettle ? '' : '<span class="expense__people">' + e.participants.map((p) => av(p, 'xs')).join('') +
        '<span class="muted small">' + (everyone ? 'todos' : esc(e.participants.map(name).join(', '))) + '</span></span>') +
      '</span>' +
      '<span class="expense__amt"><b>' + U.fmtEUR(e.amountCents) + '</b>' + mineLine + '</span>' +
      '</button>';
  }

  function historyHtml(list) {
    if (!list.length) return ui.empty('Todavía no hay gastos.<br>Pulsen <b>+ Añadir gasto</b> para registrar el primero.');
    const groups = {};
    list.forEach((e) => { (groups[e.date || ''] = groups[e.date || ''] || []).push(e); });
    return Object.keys(groups).sort().reverse().map((d) =>
      '<h4 class="date-title">' + esc(d ? U.fmtDateLong(d) : 'Sin fecha') + '</h4><div class="card list">' + groups[d].map(expenseRow).join('') + '</div>').join('');
  }

  /* ---------- Tabla tipo Excel ---------- */
  function tableHtml(list) {
    if (!list.length) return ui.empty('No hay gastos que mostrar.');
    const people = store.travellers();
    const order = store.travellerIds();
    const totals = {};
    let total = 0;
    const rows = list.slice().reverse().map((e) => {
      const shares = F.expenseShares(e, order);
      if (e.category !== F.SETTLEMENT) total += e.amountCents;
      return '<tr data-action="edit-expense" data-id="' + esc(e.id) + '"' + (e.category === F.SETTLEMENT ? ' class="is-settle"' : '') + '>' +
        '<td class="nowrap">' + esc(U.fmtDate(e.date)) + '</td>' +
        '<td class="desc">' + catIcon(e.category) + ' ' + esc(e.category === F.SETTLEMENT ? 'Reembolso' : e.description) + '</td>' +
        '<td class="num">' + U.fmtEUR(e.amountCents) + '</td>' +
        '<td>' + esc(name(e.paidBy)) + '</td>' +
        people.map((p) => {
          const s = shares[p.id];
          if (s != null && e.category !== F.SETTLEMENT) totals[p.id] = (totals[p.id] || 0) + s;
          return '<td class="num' + (s == null ? ' muted' : '') + '">' + (s == null ? '–' : U.fmtEUR(s)) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="xl">' +
      '<thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th><th>Pagó</th>' +
      people.map((p) => '<th class="num">' + esc(p.name) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td></td><td>Total gastado (partes)</td><td class="num">' + U.fmtEUR(total) + '</td><td></td>' +
      people.map((p) => '<td class="num">' + U.fmtEUR(totals[p.id] || 0) + '</td>').join('') + '</tr></tfoot>' +
      '</table></div>' +
      '<p class="muted small">Cada celda es la parte de esa persona en el gasto. Los reembolsos aparecen en gris y no cuentan como gasto. Toca una fila para editarla.</p>' +
      '<div class="row-actions"><button type="button" class="btn btn--sm" data-action="csv">⬇ Descargar CSV (Excel / Google Sheets)</button></div>';
  }

  /* ---------- Saldos ---------- */
  function balancesHtml(sum) {
    const people = store.travellers();
    const anyRepaid = people.some((p) => sum.people[p.id] && (sum.people[p.id].settledOut || sum.people[p.id].settledIn));
    const rows = people.map((p) => {
      const s = sum.people[p.id] || { paid: 0, share: 0, balance: 0, settledOut: 0, settledIn: 0 };
      return '<tr><td>' + av(p.id, 'sm') + ' ' + esc(p.name) + '</td>' +
        '<td class="num">' + U.fmtEUR(s.paid) + '</td>' +
        '<td class="num">' + U.fmtEUR(s.share) + '</td>' +
        (anyRepaid ? '<td class="num muted">' + (s.settledOut || s.settledIn ? signed(s.settledOut - s.settledIn) : '–') + '</td>' : '') +
        '<td class="num ' + balanceClass(s.balance) + '"><b>' + signed(s.balance) + '</b></td></tr>';
    }).join('');

    const max = Math.max(1, ...Object.values(sum.byCategory));
    const cats = C.EXPENSE_CATEGORIES.filter((c) => sum.byCategory[c.id]).map((c) =>
      '<div class="bar"><span class="bar__label">' + c.icon + ' ' + esc(c.label) + '</span>' +
      '<span class="bar__track"><span class="bar__fill" style="width:' + ((sum.byCategory[c.id] / max) * 100).toFixed(1) + '%"></span></span>' +
      '<span class="bar__val">' + U.fmtEUR(sum.byCategory[c.id]) + '</span></div>').join('');

    const maxCity = Math.max(1, ...Object.values(sum.byCity));
    const cityRows = store.cities().map((c) => ({ id: c.id, label: store.cityLabel(c) })).concat([{ id: 'none', label: 'Sin ciudad' }])
      .filter((c) => sum.byCity[c.id]).map((c) =>
        '<div class="bar"><span class="bar__label">' + esc(c.label) + '</span>' +
        '<span class="bar__track"><span class="bar__fill bar__fill--alt" style="width:' + ((sum.byCity[c.id] / maxCity) * 100).toFixed(1) + '%"></span></span>' +
        '<span class="bar__val">' + U.fmtEUR(sum.byCity[c.id]) + '</span></div>').join('');

    return '<div class="card"><div class="table-wrap"><table class="xl xl--balances">' +
      '<thead><tr><th>Quién</th><th class="num">Pagó</th><th class="num">Su parte</th>' + (anyRepaid ? '<th class="num">Reemb.</th>' : '') + '<th class="num">Saldo</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<p class="muted small">Pagó = lo que pagó por el grupo. Su parte = lo que consumió. Saldo = pagó − su parte (+ reembolsos): <span class="pos">positivo</span> significa que debe recibir dinero; <span class="neg">negativo</span>, que debe.</p></div>' +
      (cats ? ui.rule('Por categoría') + '<div class="card">' + cats + '</div>' : '') +
      (cityRows ? ui.rule('Por ciudad') + '<div class="card">' + cityRows + '</div>' : '');
  }

  /* ---------- Saldar cuentas ---------- */
  function settleHtml(sum) {
    const transfers = F.settleUp(sum.people);
    if (!transfers.length) return ui.empty('🎉 Todo el mundo está al día. Nadie debe nada.');
    return '<p class="muted small">El menor número de pagos para saldar todas las deudas:</p><div class="card list">' +
      transfers.map((t) =>
        '<div class="transfer">' + av(t.from) + '<span class="transfer__text"><b>' + esc(name(t.from)) + '</b> paga a <b>' + esc(name(t.to)) + '</b></span>' + av(t.to) +
        '<span class="transfer__amt">' + U.fmtEUR(t.amountCents) + '</span>' +
        '<button type="button" class="btn btn--sm btn--accent" data-action="settle" data-from="' + esc(t.from) + '" data-to="' + esc(t.to) + '" data-amt="' + t.amountCents + '">Marcar pagado</button></div>').join('') +
      '</div><p class="muted small">"Marcar pagado" registra un reembolso para que los saldos vuelvan a cero. No envía dinero.</p>';
  }

  /* ---------- Formulario ---------- */
  function expenseForm(exp) {
    const expId = exp ? exp.id : U.uid('exp');
    let cityTouched = !!exp;
    const people = store.travellers();
    const order = store.travellerIds();
    const today = U.todayIso();
    const defaults = {
      date: today, cityId: cityForDate(today), paidBy: T.app.profileId() || order[0], participants: order.slice(), category: 'food', amountCents: null,
    };
    const fields = [
      { name: 'description', label: 'Concepto', required: true, placeholder: 'p. ej. Cena en Trastevere' },
      { name: 'amountCents', label: 'Importe', type: 'money', required: true, half: true, placeholder: '0,00' },
      { name: 'date', label: 'Fecha', type: 'date', required: true, half: true },
      { name: 'paidBy', label: 'Pagó', type: 'select', half: true, options: people.map((p) => ({ value: p.id, label: p.name })) },
      { name: 'category', label: 'Categoría', type: 'select', half: true, options: C.EXPENSE_CATEGORIES.map((c) => ({ value: c.id, label: c.icon + ' ' + c.label })) },
      { name: 'cityId', label: 'Ciudad', type: 'select', options: [{ value: '', label: '— Sin ciudad —' }].concat(store.cities().map((c) => ({ value: c.id, label: store.cityLabel(c) }))) },
      { name: 'participants', label: 'Dividir a partes iguales entre', type: 'checkboxes', required: true, allToggle: true, options: people.map((p) => ({ value: p.id, label: p.name, color: p.color })), hint: 'Marquen solo a quienes participaron.' },
      { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
    ];
    ui.openForm({
      title: exp ? 'Editar gasto' : 'Nuevo gasto',
      fields,
      values: exp || defaults,
      preview(v) {
        if (!v.amountCents || !v.participants || !v.participants.length) return '<p class="muted small">Introduce un importe y elige participantes para ver el reparto.</p>';
        const shares = F.splitEqually(v.amountCents, v.participants, order, expId);
        const lines = order.filter((id) => shares[id] != null).map((id) =>
          '<li>' + av(id, 'xs') + ' ' + esc(name(id)) + ': <b>' + U.fmtEUR(shares[id]) + '</b>' +
          (id === v.paidBy ? ' <span class="muted">(pagó)</span>' : ' <span class="muted">→ debe a ' + esc(name(v.paidBy)) + '</span>') + '</li>').join('');
        const excluded = order.filter((id) => shares[id] == null).map(name);
        return '<p class="small"><b>Reparto:</b> ' + U.fmtEUR(v.amountCents) + ' ÷ ' + v.participants.length + '</p><ul class="split">' + lines + '</ul>' +
          (excluded.length ? '<p class="muted small">No participan: ' + esc(excluded.join(', ')) + '</p>' : '');
      },
      onFieldInput(e, form) {
        if (e.target.name === 'cityId') cityTouched = true;
        if (e.target.name === 'date' && !cityTouched && U.isIsoDate(e.target.value)) form.elements.cityId.value = cityForDate(e.target.value);
      },
      onSubmit(v) {
        if (!v.amountCents || v.amountCents <= 0) return 'El importe debe ser mayor que 0 €.';
        if (!U.isIsoDate(v.date)) return 'Elige una fecha.';
        if (v.category === F.SETTLEMENT && v.participants.length !== 1) return 'Un reembolso debe ir a una sola persona.';
        if (v.category === F.SETTLEMENT && v.participants[0] === v.paidBy) return 'Un reembolso debe ir a otra persona.';
        if (v.category === F.SETTLEMENT && !v.description) v.description = 'Reembolso';
        store.upsert('expenses', Object.assign({ id: expId }, v));
        ui.toast(exp ? 'Gasto actualizado' : 'Gasto añadido');
      },
      onDelete: exp ? () => { store.remove('expenses', exp.id); ui.toast('Gasto eliminado'); } : null,
    });
  }

  function downloadCsv(list) {
    const people = store.travellers();
    const order = store.travellerIds();
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const money = (c) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
    const head = ['Fecha', 'Concepto', 'Ciudad', 'Categoría', 'Importe EUR', 'Pagó', 'Participantes'].concat(people.map((p) => 'Parte de ' + p.name)).concat(['Notas']);
    const lines = [head.map(q).join(';')].concat(list.slice().reverse().map((e) => {
      const shares = F.expenseShares(e, order);
      return [e.date, e.description, store.cityLabelById(e.cityId), C.label(C.EXPENSE_CATEGORIES, e.category), money(e.amountCents), name(e.paidBy), e.participants.map(name).join(' + ')]
        .concat(people.map((p) => money(shares[p.id]))).concat([e.notes]).map(q).join(';');
    }));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eurotrip-2027-gastos-' + U.todayIso() + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  T.views.expenses = {
    render(el) {
      const tab = S.get('expTab', 'list');
      const sum = F.summarize(store.list('expenses'), store.travellerIds());
      const list = filtered();
      const cityF = S.get('expCity', 'all');
      const personF = S.get('expPerson', 'all');
      const filters = (tab === 'list' || tab === 'table') ? '<div class="filter-row">' +
        '<select data-action="exp-city" aria-label="Filtrar por ciudad"><option value="all">Todas las ciudades</option>' +
        store.cities().map((c) => '<option value="' + esc(c.id) + '"' + (c.id === cityF ? ' selected' : '') + '>' + esc(store.cityLabel(c)) + '</option>').join('') +
        '<option value="none"' + (cityF === 'none' ? ' selected' : '') + '>Sin ciudad</option></select>' +
        '<select data-action="exp-person" aria-label="Filtrar por persona"><option value="all">Todo el grupo</option>' +
        store.travellers().map((t) => '<option value="' + esc(t.id) + '"' + (t.id === personF ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') +
        '</select></div>' : '';

      el.innerHTML =
        '<section class="page"><div class="page__head"><div><p class="kicker">Cuentas claras</p><h2 class="display">Gastos</h2></div>' +
        '<button type="button" class="btn btn--primary btn--sm" data-action="add-expense">+ Añadir gasto</button></div></section>' +
        summaryHtml(sum) +
        '<section class="page">' +
        ui.segmented([{ id: 'list', label: 'Historial' }, { id: 'table', label: 'Tabla' }, { id: 'balances', label: 'Saldos' }, { id: 'settle', label: 'Saldar' }], tab, 'exp-tab') +
        filters +
        ({ list: () => historyHtml(list), table: () => tableHtml(list), balances: () => balancesHtml(sum), settle: () => settleHtml(sum) }[tab] || (() => ''))() +
        '</section>' +
        '<button type="button" class="fab" data-action="add-expense" aria-label="Añadir gasto">+</button>';
    },
    onClick(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      switch (a.dataset.action) {
        case 'exp-tab': S.set('expTab', a.dataset.id); T.app.render(); break;
        case 'add-expense': expenseForm(null); break;
        case 'edit-expense': expenseForm(store.get('expenses', a.dataset.id)); break;
        case 'csv': downloadCsv(filtered()); break;
        case 'settle': {
          const from = a.dataset.from;
          const to = a.dataset.to;
          const amt = parseInt(a.dataset.amt, 10);
          ui.confirm('¿' + name(from) + ' pagó ' + U.fmtEUR(amt) + ' a ' + name(to) + '? Se registrará como reembolso.', { okLabel: 'Registrar reembolso', title: 'Marcar como pagado' }).then((ok) => {
            if (!ok) return;
            store.upsert('expenses', { description: 'Reembolso', amountCents: amt, date: U.todayIso(), cityId: '', paidBy: from, participants: [to], category: F.SETTLEMENT, notes: '' });
            ui.toast('Reembolso registrado 🤝');
          });
          break;
        }
      }
    },
    onChange(e) {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'exp-city') { S.set('expCity', a.value); T.app.render(); }
      if (a.dataset.action === 'exp-person') { S.set('expPerson', a.value); T.app.render(); }
    },
  };
})(typeof self !== 'undefined' ? self : this);
