/* Run with: node tests/store.test.js — loads the browser scripts in a sandbox with a fake localStorage. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeBrowser(preset) {
  const mem = Object.assign({}, preset || {});
  const sandbox = {
    console,
    URL,
    localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  ['js/core/utils.js', 'js/core/finance.js', 'js/data/images.js', 'js/data/places.js', 'js/data/seed.js', 'js/core/store.js'].forEach((f) =>
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f }));
  sandbox.Trip.store.init();
  return sandbox.Trip;
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }
const clone = (o) => JSON.parse(JSON.stringify(o));

test('seed data loads with 4 travellers, 9 cities and 24 nights', () => {
  const T = makeBrowser();
  const s = T.store;
  assert.strictEqual(s.travellers().map((t) => t.name).join(','), 'Isa,Pili,Pastu,Lenva');
  assert.strictEqual(s.cities().length, 9);
  assert.strictEqual(s.cities().reduce((a, c) => a + T.utils.nights(c.arrive, c.depart), 0), 24);
  assert.strictEqual(s.cityLabelById('weimar-prague'), 'Weimar o Praga');
});

test('export validates and round-trips', () => {
  const T = makeBrowser();
  T.store.upsert('expenses', { description: 'Dinner', amountCents: 10000, date: '2027-03-16', cityId: 'madrid', paidBy: 'isa', participants: ['pastu', 'isa', 'pili'], category: 'food' });
  const payload = clone(T.store.exportPayload('Isa'));
  const v = T.store.validate(payload);
  assert.ok(v.ok, v.errors.join(';'));
  const T2 = makeBrowser();
  T2.store.replaceWith(payload);
  assert.strictEqual(T2.store.list('expenses').length, 1);
});

test('validation rejects bad files', () => {
  const T = makeBrowser();
  assert.ok(!T.store.validate(null).ok);
  assert.ok(!T.store.validate({ foo: 1 }).ok);
  const p = clone(T.store.exportPayload());
  p.expenses = [{ id: 'x', amountCents: -5, paidBy: 'nobody', participants: [] }];
  const v = T.store.validate(p);
  assert.ok(!v.ok);
  assert.ok(v.errors.length >= 3);
  const p2 = clone(T.store.exportPayload());
  p2.schemaVersion = 99;
  assert.ok(!T.store.validate(p2).ok);
});

test('merge combines expenses, likes and deletions from two phones', () => {
  const isa = makeBrowser();
  const pili = makeBrowser();
  isa.store.upsert('expenses', { description: 'Taxi', amountCents: 3000, date: '2027-03-16', paidBy: 'isa', participants: ['isa', 'pili'], category: 'transport' });
  pili.store.upsert('expenses', { description: 'Museum', amountCents: 6000, date: '2027-03-17', paidBy: 'pili', participants: ['isa', 'pili', 'pastu', 'lenva'], category: 'activities' });
  // Un lugar añadido por Isa que llega a Pili, y otro que Pili borra después.
  isa.store.upsert('activities', { id: 'act-u1', cityId: 'madrid', category: 'cafes', name: 'Café Comercial', addedBy: 'isa', website: 'https://example.org' });
  isa.store.upsert('activities', { id: 'act-u2', cityId: 'madrid', category: 'restaurants', name: 'Casa Lucio', addedBy: 'isa' });
  pili.store.mergeWith(clone(isa.store.exportPayload('Isa')));
  isa.store.toggleLike('act-u1', 'isa');
  pili.store.toggleLike('act-u1', 'pili');
  isa.store.setComment('act-u1', 'c-isa', 'isa', 'Desayuno el día 17');
  pili.store.setComment('act-u1', 'c-pili', 'pili', '¡Sí!');
  pili.store.remove('activities', 'act-u2');

  const stats = isa.store.mergeWith(clone(pili.store.exportPayload('Pili')));
  assert.strictEqual(isa.store.list('expenses').length, 2);
  const cafe = isa.store.get('activities', 'act-u1');
  assert.ok(cafe.likes.isa.liked && cafe.likes.pili.liked, 'both likes kept');
  assert.strictEqual(Object.keys(cafe.comments).length, 2, 'both comments kept');
  assert.strictEqual(cafe.addedBy, 'isa');
  assert.strictEqual(isa.store.get('activities', 'act-u2'), null, 'deletion propagated');
  assert.ok(stats.added >= 1 && stats.removed >= 1);

  // Merging the same file again changes nothing.
  const again = isa.store.mergeWith(clone(pili.store.exportPayload('Pili')));
  assert.strictEqual(again.added, 0);
  assert.strictEqual(isa.store.list('expenses').length, 2);
});

test('choosing Weimar hides Prague-only items', () => {
  const T = makeBrowser();
  T.store.setCityChoice('weimar-prague', 'weimar');
  assert.strictEqual(T.store.cityLabelById('weimar-prague'), 'Weimar');
  const rec = (id) => T.store.recommendations().find((r) => r.id === id);
  assert.ok(!T.store.variantVisible(rec('act-praguecastle')));
  assert.ok(T.store.variantVisible(rec('act-goethe')));
});

test('the itinerary starts EMPTY and recommendations live in a separate catalogue', () => {
  const T = makeBrowser();
  assert.strictEqual(T.store.list('activities').length, 0, 'no activities by default');
  assert.ok(!JSON.stringify(T.store.exportPayload()).includes('act-prado'), 'recommendations are not part of the shared document');
  const acts = T.store.recommendations();
  ['madrid', 'barcelona', 'rome', 'florence', 'venice', 'munich', 'weimar-prague', 'berlin', 'frankfurt'].forEach((c) => {
    const n = acts.filter((a) => a.cityId === c).length;
    assert.ok(n >= 12, c + ' has ' + n);
  });
  const cats = new Set(acts.map((a) => a.category));
  T.constants.ACTIVITY_CATEGORIES.forEach((c) => assert.ok(cats.has(c.id), 'category used: ' + c.id));
  assert.ok(acts.filter((a) => a.image).length > acts.length * 0.9, 'most activities have a photo');
});

test('v1 data upgrades to v3 keeping expenses, likes, photos and user records', () => {
  const OLD = '2026-11-18T00:00:00.000Z';
  const later = '2026-11-18T12:00:00.000Z';
  const T0 = makeBrowser();
  const v2 = clone(T0.store.exportPayload());
  const v1 = Object.assign({}, v2, { schemaVersion: 1 });
  v1.expenses = [{ id: 'exp-1', description: 'Dinner', amountCents: 10000, date: '2027-03-16', cityId: 'madrid', paidBy: 'isa', participants: ['isa', 'pili', 'pastu'], category: 'food', notes: '', createdAt: later, updatedAt: later }];
  v1.activities = T0.seed.buildV2().activities.map((a) => Object.assign({}, a, { name: a.id === 'act-prado' ? 'Prado Museum' : a.name, createdAt: OLD, updatedAt: OLD }));
  const prado1 = v1.activities.find((a) => a.id === 'act-prado');
  prado1.likes = { pili: { liked: true, at: later } };
  prado1.updatedAt = later;
  v1.activities.push({ id: 'act-oldseed', cityId: 'berlin', name: 'Old English seed', category: 'museums', createdAt: OLD, updatedAt: OLD, likes: {} });
  v1.activities.push({ id: 'act-mine', cityId: 'rome', name: 'Mi bar favorito', category: 'nightlife', createdAt: later, updatedAt: later, likes: {} });
  v1.travellers = v2.travellers.map((t) => Object.assign({}, t, { createdAt: OLD, updatedAt: OLD }));
  v1.travellers[0].photo = 'data:image/jpeg;base64,AAAA';
  const T = makeBrowser({ 'eurotrip2027.data': JSON.stringify(v1) });
  const s = T.store;
  assert.strictEqual(s.doc.schemaVersion, 3);
  assert.strictEqual(s.list('expenses').length, 1);
  assert.strictEqual(s.get('expenses', 'exp-1').amountCents, 10000);
  const prado = s.get('activities', 'act-prado');
  assert.ok(prado.likes.pili.liked, 'like kept');
  assert.ok(!/Prado Museum/.test(prado.name), 'content now in Spanish: ' + prado.name);
  assert.strictEqual(s.get('activities', 'act-oldseed'), null, 'stale English seed removed');
  assert.ok(s.get('activities', 'act-mine'), 'user activity kept');
  assert.strictEqual(s.traveller('isa').photo, 'data:image/jpeg;base64,AAAA');
});

test('v2 data upgrades to v3: untouched recommendations leave the itinerary, chosen ones stay', () => {
  const T0 = makeBrowser();
  const v2 = clone(T0.store.exportPayload());
  v2.schemaVersion = 2;
  v2.activities = T0.seed.buildV2().activities;
  v2.activities.find((a) => a.id === 'act-sagrada').likes = { pili: { liked: true, at: '2026-11-18T10:00:00.000Z' } };
  v2.activities.find((a) => a.id === 'act-colosseum').planned = true;
  v2.activities.find((a) => a.id === 'act-uffizi').notes = 'Reservar con antelación';
  v2.activities.push({ id: 'act-mine', cityId: 'berlin', name: 'Bar propio', category: 'nightlife', createdAt: '2026-11-18T11:00:00.000Z', updatedAt: '2026-11-18T11:00:00.000Z', likes: {} });
  v2.expenses = [{ id: 'e1', description: 'x', amountCents: 500, date: '2027-03-16', paidBy: 'isa', participants: ['isa', 'pili'], category: 'food', createdAt: 'a', updatedAt: 'a' }];
  const T = makeBrowser({ 'eurotrip2027.data': JSON.stringify(v2) });
  const ids = T.store.list('activities').map((a) => a.id).sort().join(',');
  assert.strictEqual(ids, 'act-colosseum,act-mine,act-sagrada,act-uffizi');
  assert.strictEqual(T.store.get('activities', 'act-sagrada').recId, 'act-sagrada');
  assert.strictEqual(T.store.get('activities', 'act-sagrada').addedBy, 'pili');
  assert.strictEqual(T.store.list('expenses').length, 1, 'expenses untouched');
  assert.ok(T.store.doc.tombstones['act-prado'], 'removed recommendations are tombstoned so an old export cannot bring them back');
  // Merging an un-upgraded v2 export from another phone does not refill the itinerary.
  T.store.mergeWith(clone(v2));
  assert.strictEqual(T.store.list('activities').length, 4);
});

test('profile photo travels through export and merge', () => {
  const isa = makeBrowser();
  const pili = makeBrowser();
  isa.store.updateTraveller('isa', { photo: 'data:image/jpeg;base64,QUJD', avatar: '🌻' });
  pili.store.mergeWith(clone(isa.store.exportPayload('Isa')));
  assert.strictEqual(pili.store.traveller('isa').photo, 'data:image/jpeg;base64,QUJD');
  assert.strictEqual(pili.store.traveller('isa').avatar, '🌻');
});

test('a phone opened AFTER someone uploaded a photo still receives it (untouched profiles never win)', () => {
  const isa = makeBrowser();
  isa.store.updateTraveller('pili', { photo: 'data:image/jpeg;base64,UElMSQ==' });
  const exported = clone(isa.store.exportPayload('Isa'));
  // Teléfono nuevo, abierto más tarde.
  const lenva = makeBrowser();
  lenva.store.mergeWith(clone(exported));
  assert.strictEqual(lenva.store.traveller('pili').photo, 'data:image/jpeg;base64,UElMSQ==');
  // Teléfono con datos antiguos donde los perfiles sin tocar quedaron con la hora de apertura.
  const old = clone(lenva.store.exportPayload());
  old.travellers.forEach((t) => { t.photo = ''; t.updatedAt = '2099-01-01T00:00:00.000Z'; });
  const pastu = makeBrowser({ 'eurotrip2027.data': JSON.stringify(old) });
  pastu.store.mergeWith(clone(exported));
  assert.strictEqual(pastu.store.traveller('pili').photo, 'data:image/jpeg;base64,UElMSQ==');
  // Y sin foto, el perfil usa su avatar ilustrado por defecto (la foto propia lo sustituye).
  assert.strictEqual(isa.store.traveller('isa').photo, '');
});

console.log('\n' + passed + ' store tests passed');
