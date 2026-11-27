// Run with: node --test diligence-compass/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

function close(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} expected ${expected} ± ${tol}, got ${actual}`);
}

function deterministicModel() {
  // Every driver pinned (P10 = P90 = base) and no risks: the simulation must
  // collapse to the deal case.
  const m = E.sampleModel();
  for (const k of Object.keys(m.drivers)) {
    const d = m.drivers[k];
    d.auto = false; d.p10 = d.base; d.p90 = d.base;
  }
  m.events = [];
  m.deal.samples = 1000;
  return m;
}

test('returns model matches a hand calculation', () => {
  const deal = {
    revenue: 100, ebitda: 20, entryMultiple: 10, leverage: 0, feesPct: 0,
    hold: 5, hurdle: 15, targetMoic: 2
  };
  const v = { qoe: 100, growth: 0, marginDelta: 0, exitMultiple: 10, cashConversion: 50, interestRate: 8 };
  const r = E.evaluate(deal, v, [], null, true);
  // No debt: cash builds at 20 * 50% = 10 a year for 5 years = 50 of net cash.
  // Exit EV = 20 * 10 = 200; equity = 200 + 50 = 250 on 200 invested.
  close(r.equity0, 200, 1e-9, 'equity in');
  close(r.equityT, 250, 1e-9, 'equity out');
  close(r.moic, 1.25, 1e-12, 'moic');
  close(r.irr, Math.pow(1.25, 1 / 5) - 1, 1e-12, 'irr');
  close(r.npv, 250 / Math.pow(1.15, 5) - 200, 1e-9, 'npv');
});

test('debt is repaid from cash flow, with interest on the opening balance', () => {
  const deal = { revenue: 100, ebitda: 20, entryMultiple: 10, leverage: 2, feesPct: 0, hold: 1, hurdle: 0, targetMoic: 2 };
  const v = { qoe: 100, growth: 0, marginDelta: 0, exitMultiple: 10, cashConversion: 100, interestRate: 10 };
  const r = E.evaluate(deal, v, [], null, true);
  // Debt 40, interest 4, FCF 20 - 4 = 16, closing debt 24. Equity out = 200 - 24 = 176 on 160 in.
  close(r.detail.netDebtT, 24, 1e-9);
  close(r.equityT, 176, 1e-9);
  close(r.moic, 176 / 160, 1e-12);
});

test('value-creation bridge adds up to equity at exit', () => {
  const m = E.sampleModel();
  const r = E.evaluate(m.deal, E.baseValues(m), m.events, null, true);
  const b = r.bridge;
  const sum = b.equityIn + b.qoeGap + b.revenueGrowth + b.marginChange + b.multipleChange + b.deleverage + b.fees + b.floor;
  close(sum, b.equityOut, 1e-6, 'bridge');
  assert.equal(b.floor, 0);
});

test('equity never goes below zero and the bridge records the floor', () => {
  const m = E.sampleModel();
  const v = E.baseValues(m);
  v.exitMultiple = 1; v.growth = -30;
  const r = E.evaluate(m.deal, v, m.events, null, true);
  assert.equal(r.equityT, 0);
  assert.equal(r.moic, 0);
  assert.equal(r.irr, -1);
  const b = r.bridge;
  close(b.equityIn + b.qoeGap + b.revenueGrowth + b.marginChange + b.multipleChange + b.deleverage + b.fees + b.floor, 0, 1e-6);
  assert.ok(b.floor > 0);
});

test('risk events move the outcome in the stated direction', () => {
  const m = E.sampleModel();
  const v = E.baseValues(m);
  const none = E.evaluate(m.deal, v, m.events, [false, false, false]).moic;
  for (let i = 0; i < m.events.length; i++) {
    const flags = m.events.map((_, j) => j === i);
    assert.ok(E.evaluate(m.deal, v, m.events, flags).moic < none, `event ${i} should hurt`);
  }
});

test('confidence widens the range; typed ranges override and may be lopsided', () => {
  const def = E.DRIVER_BY_KEY.growth;
  const H = E.rangeFor(def, { base: 10, conf: 'H', auto: true });
  const L = E.rangeFor(def, { base: 10, conf: 'L', auto: true });
  assert.ok(L.p90 - L.p10 > H.p90 - H.p10);
  const custom = E.rangeFor(def, { base: 10, conf: 'H', auto: false, p10: 0, p90: 12 });
  assert.equal(custom.p10, 0);
  assert.equal(custom.p90, 12);
  close(E.splitCdf(custom, 0), 0.1, 1e-6, 'P10');
  close(E.splitCdf(custom, 10), 0.5, 1e-7, 'median');
  close(E.splitCdf(custom, 12), 0.9, 1e-6, 'P90');
});

test('simulated draws honour each driver\'s P10 and P90', () => {
  const m = E.sampleModel();
  m.deal.samples = 20000;
  m.drivers.growth = { base: 10, conf: 'M', auto: false, p10: 0, p90: 14, source: '', cost: null };
  const sim = E.simulate(m);
  const k = E.DRIVERS.findIndex(d => d.key === 'growth');
  const xs = Array.from(sim.X[k]).sort((a, b) => a - b);
  close(E._internal.quantileSorted(xs, 0.1), 0, 0.35, 'P10');
  close(E._internal.quantileSorted(xs, 0.5), 10, 0.25, 'median');
  close(E._internal.quantileSorted(xs, 0.9), 14, 0.25, 'P90');
});

test('the same seed gives the same answer', () => {
  const a = E.analyze(E.sampleModel());
  const b = E.analyze(E.sampleModel());
  assert.equal(a.stats.meanNpv, b.stats.meanNpv);
  assert.deepEqual(a.queue.map(q => q.key), b.queue.map(q => q.key));
});

test('with nothing uncertain, the simulation equals the deal case and nothing is worth knowing', () => {
  const a = E.analyze(deterministicModel());
  assert.ok(a.ok);
  close(a.stats.p10, a.base.moic, 1e-9);
  close(a.stats.p90, a.base.moic, 1e-9);
  assert.equal(a.evpi, 0);
  for (const it of a.queue) assert.equal(it.evppi, 0);
});

test('walk-away price is where expected value at the hurdle is zero', () => {
  const m = E.sampleModel();
  const a = E.analyze(m);
  m.deal.entryMultiple = a.walkAway;
  const b = E.analyze(m);
  close(b.stats.meanNpv, 0, 1e-6, 'mean NPV at walk-away price');
});

test('an assumption that cannot affect returns is flagged as noise', () => {
  const m = E.sampleModel();
  m.deal.leverage = 0;                       // no debt, so the interest rate is irrelevant
  m.drivers.interestRate.conf = 'L';
  const a = E.analyze(m);
  const rate = a.queue.find(q => q.key === 'interestRate');
  assert.ok(rate.noise, 'cost of debt should be inside simulation noise');
  assert.ok(rate.share < 0.005);
  assert.equal(a.queue[a.queue.length - 1].noise, true);
});

test('per-unknown value of information never exceeds the value of knowing everything', () => {
  const a = E.analyze(E.sampleModel());
  for (const it of a.queue) assert.ok(it.evppi <= a.evpi + 1e-6, `${it.key}: ${it.evppi} > ${a.evpi}`);
});

test('a deal far above the hurdle has no information worth buying', () => {
  const m = E.sampleModel();
  m.deal.entryMultiple = 5;
  m.deal.leverage = 2;
  const a = E.analyze(m);
  assert.equal(a.decision.code, 'clears');
  assert.ok(a.evpi < 0.02 * a.equity0, `EVPI ${a.evpi} should be small next to ${a.equity0}`);
  assert.ok(a.stats.pLoss < 0.02);
});

test('regression estimate of EVPPI agrees with a brute-force nested simulation', () => {
  // Uncorrelated drivers so the conditional distribution is easy to sample.
  const m = E.sampleModel();
  m.deal.rhoGM = 0;
  m.deal.samples = 20000;
  m.deal.seed = 11;
  const a = E.analyze(m);
  const est = a.queue.find(q => q.key === 'exitMultiple').evppi;

  // Brute force: for each of K outer draws of the exit multiple, estimate
  // E[NPV | exit multiple] with an inner simulation over everything else.
  const K = 120, inner = 2500;
  const outer = E._internal.mulberry32(99);
  const def = E.DRIVER_BY_KEY.exitMultiple;
  const rg = E.rangeFor(def, m.drivers.exitMultiple);
  const innerModel = JSON.parse(JSON.stringify(m));
  innerModel.deal.samples = inner;
  let acc = 0, overall = 0;
  for (let k = 0; k < K; k++) {
    // stratified draw of the outer value
    const u = (k + outer()) / K;
    const z = invNorm(u);
    const x = Math.min(def.max, Math.max(def.min, rg.base + (z < 0 ? rg.sL : rg.sR) * z));
    innerModel.drivers.exitMultiple = { base: x, conf: 'H', auto: false, p10: x, p90: x };
    innerModel.deal.seed = 1000 + k;
    const sim = E.simulate(innerModel);
    let s = 0;
    for (let i = 0; i < sim.N; i++) s += sim.npv[i];
    const cond = s / sim.N;
    acc += Math.max(cond, 0);
    overall += cond;
  }
  const brute = acc / K - Math.max(overall / K, 0);
  const rel = Math.abs(est - brute) / brute;
  if (process.env.VERBOSE) console.log(`EVPPI exit multiple: regression ${est.toFixed(2)}, brute force ${brute.toFixed(2)}`);
  assert.ok(rel < 0.2, `regression ${est.toFixed(2)} vs brute force ${brute.toFixed(2)} (${(rel * 100).toFixed(1)}% apart)`);
});

test('thresholds reproduce the goal they were solved for', () => {
  const m = E.sampleModel();
  const t = E.solveThreshold(m, 'exitMultiple', m.deal.targetMoic);
  assert.ok(t.reachable);
  const v = E.baseValues(m);
  v.exitMultiple = t.value;
  close(E.evaluate(m.deal, v, m.events, null).moic, m.deal.targetMoic, 1e-6);
  const r = E.solveThreshold(m, 'interestRate', m.deal.targetMoic);
  assert.equal(r.higherBetter, false);
});

test('validation catches impossible deals', () => {
  const m = E.sampleModel();
  m.deal.leverage = 20;
  const a = E.analyze(m);
  assert.equal(a.ok, false);
  assert.match(a.errors.join(' '), /Debt is larger than the purchase price/);
});

test('imported files are normalised without inheriting the sample\'s text', () => {
  const m = E.normalizeModel({
    deal: { revenue: '250', ebitda: 50, currency: 'XXX' },
    drivers: { growth: { base: 9, conf: 'L' } },
    events: [{ name: 'Licence renewal', prob: 140, impact: 'nonsense', size: 5 }]
  });
  assert.equal(m.deal.revenue, 250);
  assert.equal(m.deal.name, '');
  assert.equal(m.deal.note, '');
  assert.equal(m.deal.currency, 'USD_M');
  assert.equal(m.drivers.growth.conf, 'L');
  assert.equal(m.drivers.qoe.source, '');
  assert.equal(m.events[0].prob, 100);
  assert.equal(m.events[0].impact, 'revenue');
  assert.ok(E.analyze(m).ok);
  assert.throws(() => E.normalizeModel({ hello: 1 }), /not a Diligence Compass deal file/);
});

// Acklam's inverse normal CDF, for the stratified outer draws above.
function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425, hi = 1 - lo;
  let q, r;
  if (p < lo) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > hi) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
