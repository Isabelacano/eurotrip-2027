/* Run with: node tests/finance.test.js   (no dependencies) */
const assert = require('assert');
const F = require('../js/core/finance.js');
const U = require('../js/core/utils.js');

const ALL = ['isa', 'pili', 'pastu', 'lenva'];
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

console.log('utils.toCents');
test('parses dot, comma and grouping formats', () => {
  assert.strictEqual(U.toCents('100'), 10000);
  assert.strictEqual(U.toCents('12.5'), 1250);
  assert.strictEqual(U.toCents('12,50'), 1250);
  assert.strictEqual(U.toCents('1.234,56'), 123456);
  assert.strictEqual(U.toCents('1,234.56'), 123456);
  assert.strictEqual(U.toCents('€ 7'), 700);
  assert.strictEqual(U.toCents('0.1'), 10);
  assert.ok(Number.isNaN(U.toCents('abc')));
  assert.ok(Number.isNaN(U.toCents('-5')));
  assert.ok(Number.isNaN(U.toCents('')));
});
test('nights between dates', () => {
  assert.strictEqual(U.nights('2027-03-16', '2027-03-19'), 3);
  assert.strictEqual(U.nights('2027-03-30', '2027-04-01'), 2);
  assert.strictEqual(U.nights('2027-03-27', '2027-03-29'), 2); // across EU DST change
});

console.log('finance.splitEqually');
test('€100 between 3 people sums exactly to €100', () => {
  const s = F.splitEqually(10000, ['pastu', 'isa', 'pili'], ALL, 'x');
  assert.strictEqual(sum(s), 10000);
  assert.deepStrictEqual(Object.keys(s).sort(), ['isa', 'pastu', 'pili']);
  Object.values(s).forEach((v) => assert.ok(v === 3333 || v === 3334));
  assert.strictEqual(s.lenva, undefined);
});
test('even split has no remainder', () => {
  assert.deepStrictEqual(F.splitEqually(8000, ALL, ALL), { isa: 2000, pili: 2000, pastu: 2000, lenva: 2000 });
});
test('leftover cents rotate between expenses', () => {
  const receivers = new Set();
  for (let i = 0; i < 40; i++) {
    const s = F.splitEqually(1000, ALL.slice(0, 3), ALL, 'exp-' + i);
    receivers.add(Object.keys(s).find((k) => s[k] === 334));
  }
  assert.ok(receivers.size > 1, 'extra cent should not always go to the same person');
});
test('duplicates / empty participants', () => {
  assert.deepStrictEqual(F.splitEqually(1000, [], ALL), {});
  assert.strictEqual(sum(F.splitEqually(1000, ['isa', 'isa', 'pili'], ALL)), 1000);
});

console.log('finance.summarize / settleUp');
test('spec example: Isa pays €100 for Pastu, Isa, Pili (not Lenva)', () => {
  const r = F.summarize([{ id: 'e1', amountCents: 10000, paidBy: 'isa', participants: ['pastu', 'isa', 'pili'], category: 'food' }], ALL);
  assert.strictEqual(r.groupTotal, 10000);
  assert.strictEqual(r.people.lenva.balance, 0);
  assert.strictEqual(r.people.lenva.share, 0);
  assert.strictEqual(r.people.isa.paid, 10000);
  assert.strictEqual(sum(Object.fromEntries(ALL.map((id) => [id, r.people[id].balance]))), 0);
  const t = F.settleUp(r.people);
  assert.strictEqual(t.length, 2);
  t.forEach((x) => assert.strictEqual(x.to, 'isa'));
  assert.strictEqual(t.reduce((a, x) => a + x.amountCents, 0), r.people.isa.balance);
});
test('many random expenses: balances sum to 0 and settling clears them', () => {
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const exps = [];
  for (let i = 0; i < 300; i++) {
    const parts = ALL.filter(() => rnd() > 0.35);
    if (!parts.length) parts.push('pili');
    exps.push({ id: 'r' + i, amountCents: 1 + Math.floor(rnd() * 25000), paidBy: ALL[Math.floor(rnd() * 4)], participants: parts, category: 'food' });
  }
  const r = F.summarize(exps, ALL);
  const total = exps.reduce((a, e) => a + e.amountCents, 0);
  assert.strictEqual(r.groupTotal, total);
  assert.strictEqual(ALL.reduce((a, id) => a + r.people[id].share, 0), total);
  assert.strictEqual(ALL.reduce((a, id) => a + r.people[id].balance, 0), 0);
  const transfers = F.settleUp(r.people);
  assert.ok(transfers.length <= 3);
  const settled = exps.concat(transfers.map((t, i) => ({ id: 's' + i, amountCents: t.amountCents, paidBy: t.from, participants: [t.to], category: 'settlement' })));
  const r2 = F.summarize(settled, ALL);
  ALL.forEach((id) => assert.strictEqual(r2.people[id].balance, 0));
  assert.strictEqual(r2.groupTotal, total, 'repayments are not counted as spending');
});
test('invalid expenses are ignored', () => {
  const r = F.summarize([{ id: 'a', amountCents: 0, paidBy: 'isa', participants: ALL }, { id: 'b', amountCents: 500, paidBy: 'isa', participants: [] }], ALL);
  assert.strictEqual(r.groupTotal, 0);
});

console.log('\n' + passed + ' tests passed');
