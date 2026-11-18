/*
 * Expense maths (pure functions, no DOM, testable with Node: `node tests/finance.test.js`).
 *
 * All amounts are INTEGER EURO CENTS, so there are no floating-point rounding errors.
 *
 * Model: each expense has one payer and a list of participants. The amount is split equally among
 * the participants only (people who did not take part pay nothing). When the amount does not divide
 * evenly, the leftover cents (at most n-1) go one each to some participants, chosen by rotating
 * through the participant list based on the expense id, so nobody always absorbs the extra cent.
 *
 * balance = paid - share.  balance > 0 → the group owes this person; balance < 0 → this person owes.
 * The sum of all balances is always exactly 0.
 *
 * Expenses with category 'settlement' are repayments between travellers (e.g. Pili pays Isa back).
 * They move balances but are not counted as group spending.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Trip = root.Trip || {}; root.Trip.finance = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const SETTLEMENT = 'settlement';

  function hash(str) {
    let h = 0;
    str = String(str || '');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /**
   * Split `amountCents` equally among `participantIds`.
   * `order` (optional) = canonical traveller order, so results don't depend on click order.
   * `seed` (optional) = string used to decide who receives leftover cents.
   * Returns { travellerId: cents }. The values always add up exactly to amountCents.
   */
  function splitEqually(amountCents, participantIds, order, seed) {
    const unique = Array.from(new Set(participantIds || []));
    const ids = order ? order.filter((id) => unique.includes(id)).concat(unique.filter((id) => !order.includes(id))) : unique;
    const n = ids.length;
    const out = {};
    if (!n || !Number.isInteger(amountCents)) return out;
    const base = Math.floor(amountCents / n);
    const remainder = amountCents - base * n;
    const start = seed ? hash(seed) % n : 0;
    ids.forEach((id, i) => {
      const gotExtra = ((i - start + n) % n) < remainder;
      out[id] = base + (gotExtra ? 1 : 0);
    });
    return out;
  }

  /** Shares for one expense record. */
  function expenseShares(expense, order) {
    return splitEqually(expense.amountCents, expense.participants, order, expense.id);
  }

  /**
   * Full summary for a list of expenses.
   * Returns {
   *   people: { id: { paid, share, balance, settledOut, settledIn } },  // paid/share exclude settlements
   *   groupTotal, byCategory: {cat: cents}, byCity: {cityId: cents}, count
   * }
   */
  function summarize(expenses, travellerIds) {
    const people = {};
    travellerIds.forEach((id) => { people[id] = { paid: 0, share: 0, balance: 0, settledOut: 0, settledIn: 0 }; });
    const ensure = (id) => people[id] || (people[id] = { paid: 0, share: 0, balance: 0, settledOut: 0, settledIn: 0 });

    let groupTotal = 0;
    let count = 0;
    const byCategory = {};
    const byCity = {};

    (expenses || []).forEach((e) => {
      if (!e || !Number.isInteger(e.amountCents) || e.amountCents <= 0) return;
      if (!e.paidBy || !Array.isArray(e.participants) || e.participants.length === 0) return;
      const shares = expenseShares(e, travellerIds);
      const isSettlement = e.category === SETTLEMENT;

      ensure(e.paidBy).balance += e.amountCents;
      Object.keys(shares).forEach((id) => { ensure(id).balance -= shares[id]; });

      if (isSettlement) {
        ensure(e.paidBy).settledOut += e.amountCents;
        Object.keys(shares).forEach((id) => { ensure(id).settledIn += shares[id]; });
        return;
      }
      count++;
      groupTotal += e.amountCents;
      ensure(e.paidBy).paid += e.amountCents;
      Object.keys(shares).forEach((id) => { ensure(id).share += shares[id]; });
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + e.amountCents;
      const city = e.cityId || 'none';
      byCity[city] = (byCity[city] || 0) + e.amountCents;
    });

    return { people, groupTotal, byCategory, byCity, count };
  }

  /**
   * Turn balances into a short list of payments that settles everyone.
   * Greedy: the biggest debtor pays the biggest creditor, repeat. At most n-1 transfers.
   * Returns [{ from, to, amountCents }].
   */
  function settleUp(people) {
    const creditors = [];
    const debtors = [];
    Object.keys(people).forEach((id) => {
      const b = people[id].balance;
      if (b > 0) creditors.push({ id, amt: b });
      else if (b < 0) debtors.push({ id, amt: -b });
    });
    const byAmt = (a, b) => b.amt - a.amt || (a.id < b.id ? -1 : 1);
    creditors.sort(byAmt);
    debtors.sort(byAmt);
    const transfers = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amountCents: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt === 0) i++;
      if (creditors[j].amt === 0) j++;
    }
    return transfers;
  }

  return { SETTLEMENT, splitEqually, expenseShares, summarize, settleUp };
});
