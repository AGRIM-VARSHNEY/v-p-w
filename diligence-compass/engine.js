/*
 * Diligence Compass — calculation engine.
 *
 * Pure functions, no DOM. Loads in the browser as `window.DiligenceEngine`
 * and in Node via `require('./engine.js')`.
 *
 * What it does:
 *   1. A compact buyout / growth-equity returns model (entry → hold → exit).
 *   2. A Monte Carlo over the assumptions the deal team has NOT verified,
 *      where each assumption's spread comes from its confidence tag
 *      (HIGH / MEDIUM / LOW) or from an explicit P10–P90 range.
 *   3. Expected value of partial perfect information (EVPPI) for every
 *      assumption and every binary risk: in currency, how much the
 *      invest-or-pass decision at the fund's hurdle would improve if that one
 *      unknown were resolved before signing. This is the ranking that turns
 *      a diligence checklist into a diligence queue.
 *   4. Flip points, a pre-mortem of the losing scenarios, and
 *      "what you have to believe" thresholds.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DiligenceEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var Z90 = 1.2815515655446004; // standard normal quantile at 0.90

  // ---------------------------------------------------------------------------
  // Assumption catalogue
  // ---------------------------------------------------------------------------
  // Values are in display units: percentages as 14 (= 14%), multiples as 10.5.
  // `widths` is the default half-width of the P10–P90 band for each confidence.
  var DRIVERS = [
    {
      key: 'qoe',
      label: 'Earnings quality',
      short: 'Earnings quality',
      unit: '%',
      hint: 'True entry EBITDA as a % of the headline (adjusted) EBITDA the price is set on.',
      widths: { H: 2, M: 6, L: 12 },
      min: 10, max: 150, step: 0.5,
      question: 'Commission a quality-of-earnings review: tie adjusted EBITDA to bank statements and test every add-back that is older than 12 months or recurs every year.'
    },
    {
      key: 'growth',
      label: 'Revenue growth (CAGR over hold)',
      short: 'Revenue growth',
      unit: '%',
      hint: 'Compound annual revenue growth from entry to exit.',
      widths: { H: 2, M: 5, L: 10 },
      min: -50, max: 200, step: 0.5,
      question: 'Rebuild the revenue plan bottom-up: cohort retention, pipeline coverage, and the price-versus-volume split for the last three years.'
    },
    {
      key: 'marginDelta',
      label: 'EBITDA margin change by exit',
      short: 'Margin change',
      unit: 'pts',
      hint: 'Change in EBITDA margin between entry and exit, in percentage points.',
      widths: { H: 1, M: 2.5, L: 5 },
      min: -60, max: 60, step: 0.25,
      question: 'Walk the margin bridge line by line: which savings are already contracted, and which depend on scale the business has not reached yet?'
    },
    {
      key: 'exitMultiple',
      label: 'Exit EV / EBITDA',
      short: 'Exit multiple',
      unit: 'x',
      hint: 'Enterprise value at exit divided by exit-year EBITDA.',
      widths: { H: 0.75, M: 1.5, L: 3 },
      min: 0.5, max: 60, step: 0.25,
      question: 'Pull exits from the last five years in this sector and size band. Count how many cleared below today\'s entry multiple, and who the realistic buyers are.'
    },
    {
      key: 'cashConversion',
      label: 'Cash conversion',
      short: 'Cash conversion',
      unit: '%',
      hint: 'Share of EBITDA left after cash tax, capex and working capital, before interest.',
      widths: { H: 5, M: 10, L: 20 },
      min: -50, max: 150, step: 1,
      question: 'Rebuild free cash flow: split maintenance from growth capex, map working-capital seasonality, and confirm cash taxes paid against the returns filed.'
    },
    {
      key: 'interestRate',
      label: 'Cost of debt',
      short: 'Cost of debt',
      unit: '%',
      hint: 'All-in annual interest rate on acquisition debt.',
      widths: { H: 0.5, M: 1.25, L: 2.5 },
      min: 0, max: 50, step: 0.25,
      question: 'Get indicative terms from at least two lenders, and price the floating-rate exposure and the cost of hedging it.'
    }
  ];

  var DRIVER_BY_KEY = {};
  DRIVERS.forEach(function (d) { DRIVER_BY_KEY[d.key] = d; });

  var IMPACTS = {
    revenue: { label: 'Exit revenue', unit: '%', verb: 'cuts exit revenue by' },
    margin: { label: 'Exit margin', unit: 'pts', verb: 'cuts exit margin by' },
    multiple: { label: 'Exit multiple', unit: 'x', verb: 'takes turns off the exit multiple:' },
    cash: { label: 'One-off cash cost', unit: 'ccy', verb: 'costs, in cash before exit,' }
  };

  var CONFIDENCE = {
    H: { label: 'High', long: 'High: audited, contracted, or independently verified' },
    M: { label: 'Medium', long: 'Medium: management data, partly cross-checked' },
    L: { label: 'Low', long: 'Low: management view, unverified, or our own estimate' }
  };

  var CURRENCIES = {
    INR_CR: { label: '₹ crore', prefix: '₹', suffix: ' Cr' },
    USD_M: { label: '$ million', prefix: '$', suffix: 'M' },
    EUR_M: { label: '€ million', prefix: '€', suffix: 'M' },
    GBP_M: { label: '£ million', prefix: '£', suffix: 'M' }
  };

  // ---------------------------------------------------------------------------
  // Small numeric helpers
  // ---------------------------------------------------------------------------
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  function mulberry32(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalSource(rng) {
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = 0, v = 0;
      while (u <= 1e-12) u = rng();
      v = rng();
      var mag = Math.sqrt(-2 * Math.log(u));
      spare = mag * Math.sin(2 * Math.PI * v);
      return mag * Math.cos(2 * Math.PI * v);
    };
  }

  // Standard normal CDF (Zelen & Severo 26.2.17, |err| < 7.5e-8).
  function normCdf(z) {
    if (!isFinite(z)) return z > 0 ? 1 : 0;
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989422804014327 * Math.exp(-z * z / 2);
    var p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
  }
  function normPdf(z) { return 0.3989422804014327 * Math.exp(-z * z / 2); }

  function mean(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return a.length ? s / a.length : 0;
  }
  function variance(a, m) {
    if (m === undefined) m = mean(a);
    var s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; }
    return a.length > 1 ? s / a.length : 0;
  }
  function quantileSorted(sorted, q) {
    if (!sorted.length) return NaN;
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function sortedCopy(a) {
    var c = Array.prototype.slice.call(a);
    c.sort(function (x, y) { return x - y; });
    return c;
  }

  // Solve a small dense linear system with partial pivoting. Returns null if singular.
  function solveLinear(A, b) {
    var n = b.length, M = [], i, j, k;
    for (i = 0; i < n; i++) M.push(A[i].slice().concat([b[i]]));
    for (k = 0; k < n; k++) {
      var piv = k, best = Math.abs(M[k][k]);
      for (i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > best) { best = Math.abs(M[i][k]); piv = i; }
      if (best < 1e-12) return null;
      var tmp = M[k]; M[k] = M[piv]; M[piv] = tmp;
      for (i = k + 1; i < n; i++) {
        var f = M[i][k] / M[k][k];
        for (j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  // Least-squares cubic fit of y on x (x standardised internally).
  // Returns { predict(x), fitted: Float64Array } or null when x has no spread.
  function cubicFit(x, y) {
    var n = x.length, mx = mean(x), sx = Math.sqrt(variance(x, mx));
    if (!(sx > 1e-12)) return null;
    var P = 4, XtX = [], Xty = [], i, j, k;
    for (j = 0; j < P; j++) { XtX.push([0, 0, 0, 0]); Xty.push(0); }
    var row = [1, 0, 0, 0];
    for (i = 0; i < n; i++) {
      var z = (x[i] - mx) / sx;
      row[1] = z; row[2] = z * z; row[3] = z * z * z;
      for (j = 0; j < P; j++) {
        Xty[j] += row[j] * y[i];
        for (k = j; k < P; k++) XtX[j][k] += row[j] * row[k];
      }
    }
    for (j = 0; j < P; j++) for (k = 0; k < j; k++) XtX[j][k] = XtX[k][j];
    var beta = solveLinear(XtX, Xty);
    if (!beta) return null;
    function predict(v) {
      var z = (v - mx) / sx;
      return beta[0] + z * (beta[1] + z * (beta[2] + z * beta[3]));
    }
    var fitted = new Float64Array(n);
    for (i = 0; i < n; i++) fitted[i] = predict(x[i]);
    return { predict: predict, fitted: fitted };
  }

  // Expected value of max(mu + e, 0) - max(mu, 0) for e ~ N(0, s^2):
  // the upward bias a noisy estimate of E[V | info] adds to EVPPI.
  function noiseFloor(mu, s) {
    if (!(s > 0)) return 0;
    var r = mu / s;
    return mu * normCdf(r) + s * normPdf(r) - Math.max(mu, 0);
  }

  // ---------------------------------------------------------------------------
  // Ranges and distributions
  // ---------------------------------------------------------------------------
  // A driver's spread is a two-piece ("split") normal: the base value is the
  // median, and P10 / P90 are honoured exactly, so the range can be lopsided.
  function rangeFor(def, st) {
    var base = st.base, p10, p90;
    if (st.auto !== false || !isNum(st.p10) || !isNum(st.p90)) {
      var w = def.widths[st.conf] != null ? def.widths[st.conf] : def.widths.M;
      p10 = base - w; p90 = base + w;
    } else {
      p10 = Math.min(st.p10, base); p90 = Math.max(st.p90, base);
    }
    p10 = clamp(p10, def.min, def.max);
    p90 = clamp(p90, def.min, def.max);
    return { base: base, p10: p10, p90: p90, sL: (base - p10) / Z90, sR: (p90 - base) / Z90 };
  }

  function splitNormal(r, z) { return r.base + (z < 0 ? r.sL : r.sR) * z; }

  // P(X <= x) under the split normal (clamping ignored).
  function splitCdf(r, x) {
    if (x <= r.base) return r.sL > 0 ? normCdf((x - r.base) / r.sL) : (x < r.base ? 0 : 0.5);
    return r.sR > 0 ? normCdf((x - r.base) / r.sR) : 1;
  }

  // ---------------------------------------------------------------------------
  // The returns model
  // ---------------------------------------------------------------------------
  // deal: fixed terms. v: driver values (display units). flags: which risk
  // events happen in this world (array of booleans, or null for none).
  function evaluate(deal, v, events, flags, withBridge) {
    var T = Math.max(1, Math.round(deal.hold));
    var Eh = deal.ebitda;                       // headline EBITDA the price is set on
    var Me = deal.entryMultiple;
    var R0 = deal.revenue;
    var evEntry = Eh * Me;
    var fees = evEntry * deal.feesPct / 100;
    var debt0 = Eh * deal.leverage;              // lenders size debt on the headline
    var equity0 = evEntry + fees - debt0;

    var E0 = Eh * v.qoe / 100;                   // what the business really earns today
    var m0 = R0 > 0 ? E0 / R0 : 0;
    var g = v.growth / 100;
    var r = Math.max(0, v.interestRate / 100);
    var cc = v.cashConversion / 100;

    var revHit = 0, marHit = 0, multHit = 0, cashHit = 0;
    if (flags) {
      for (var i = 0; i < events.length; i++) {
        if (!flags[i]) continue;
        var ev = events[i], size = isNum(ev.size) ? ev.size : 0;
        if (ev.impact === 'revenue') revHit += size / 100;
        else if (ev.impact === 'margin') marHit += size / 100;
        else if (ev.impact === 'multiple') multHit += size;
        else if (ev.impact === 'cash') cashHit += size;
      }
    }

    var mT = clamp(m0 + v.marginDelta / 100 - marHit, -0.5, 0.95);
    var nd = debt0, R = R0, E = E0, interestPaid = 0;
    for (var t = 1; t <= T; t++) {
      var frac = t / T;
      R = R0 * Math.pow(1 + g, t) * Math.max(0.01, 1 - revHit * frac);
      var m = m0 + (mT - m0) * frac;
      E = R * m;
      var interest = nd > 0 ? nd * r : 0;
      interestPaid += interest;
      var fcf = (E > 0 ? E * cc : E) - interest;
      nd -= fcf;
    }
    nd += cashHit;
    var xT = Math.max(0.5, v.exitMultiple - multHit);
    var evExit = Math.max(0, E * xT);
    var equityT = Math.max(0, evExit - nd);
    var moic = equity0 > 0 ? equityT / equity0 : NaN;
    var irr = moic > 0 ? Math.pow(moic, 1 / T) - 1 : -1;
    var npv = equityT / Math.pow(1 + deal.hurdle / 100, T) - equity0;

    var out = { moic: moic, irr: irr, npv: npv, equity0: equity0, equityT: equityT };
    if (withBridge) {
      var qoeGap = (E0 - Eh) * Me;
      var revenueGrowth = (R - R0) * m0 * Me;
      var marginChange = (E - R * m0) * Me;
      var multipleChange = (xT - Me) * E;
      var deleverage = debt0 - nd;
      var sum = equity0 + qoeGap + revenueGrowth + marginChange + multipleChange + deleverage - fees;
      out.bridge = {
        equityIn: equity0,
        qoeGap: qoeGap,
        revenueGrowth: revenueGrowth,
        marginChange: marginChange,
        multipleChange: multipleChange,
        deleverage: deleverage,
        fees: -fees,
        floor: equityT - sum,
        equityOut: equityT
      };
      out.detail = {
        T: T, evEntry: evEntry, fees: fees, debt0: debt0, E0: E0, m0: m0,
        revenueT: R, ebitdaT: E, marginT: R > 0 ? E / R : 0, exitMultiple: xT,
        evExit: evExit, netDebtT: nd, interestPaid: interestPaid
      };
    }
    return out;
  }

  function baseValues(model) {
    var v = {};
    DRIVERS.forEach(function (d) { v[d.key] = model.drivers[d.key].base; });
    return v;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  function validate(model) {
    var d = model.deal, errs = [];
    function need(cond, msg) { if (!cond) errs.push(msg); }
    need(isNum(d.revenue) && d.revenue > 0, 'Entry revenue must be above zero.');
    need(isNum(d.ebitda) && d.ebitda > 0, 'Headline EBITDA must be above zero.');
    need(isNum(d.entryMultiple) && d.entryMultiple > 0, 'Entry multiple must be above zero.');
    need(isNum(d.leverage) && d.leverage >= 0, 'Leverage can\'t be negative.');
    need(isNum(d.feesPct) && d.feesPct >= 0, 'Fees can\'t be negative.');
    need(isNum(d.hold) && d.hold >= 1 && d.hold <= 15, 'Hold period must be between 1 and 15 years.');
    need(isNum(d.hurdle) && d.hurdle > -100, 'Hurdle rate must be above -100%.');
    need(isNum(d.targetMoic) && d.targetMoic > 0, 'Target multiple must be above zero.');
    if (errs.length === 0) {
      var eq = d.ebitda * d.entryMultiple * (1 + d.feesPct / 100) - d.ebitda * d.leverage;
      need(eq > 0, 'Debt is larger than the purchase price, so the equity cheque is zero or negative. Lower the leverage.');
    }
    DRIVERS.forEach(function (def) {
      var st = model.drivers[def.key];
      need(st && isNum(st.base), def.label + ' needs a base value.');
    });
    (model.events || []).forEach(function (ev, i) {
      need(isNum(ev.prob) && ev.prob >= 0 && ev.prob <= 100, 'Risk ' + (i + 1) + ' needs a probability between 0 and 100%.');
      need(isNum(ev.size), 'Risk ' + (i + 1) + ' needs an impact size.');
      need(!!IMPACTS[ev.impact], 'Risk ' + (i + 1) + ' has an unknown impact type.');
    });
    return errs;
  }

  // ---------------------------------------------------------------------------
  // Monte Carlo
  // ---------------------------------------------------------------------------
  function simulate(model) {
    var deal = model.deal, events = model.events || [];
    var N = Math.round(clamp(isNum(deal.samples) ? deal.samples : 5000, 500, 50000));
    var rng = mulberry32(isNum(deal.seed) ? deal.seed : 7);
    var gauss = normalSource(rng);
    var rho = clamp(isNum(deal.rhoGM) ? deal.rhoGM : 0, -0.95, 0.95);
    var rhoC = Math.sqrt(1 - rho * rho);

    var ranges = DRIVERS.map(function (def) { return rangeFor(def, model.drivers[def.key]); });
    var X = DRIVERS.map(function () { return new Float64Array(N); });
    var F = events.map(function () { return new Uint8Array(N); });
    var moic = new Float64Array(N), irr = new Float64Array(N), npv = new Float64Array(N), eqT = new Float64Array(N);
    var gIdx = DRIVERS.findIndex(function (d) { return d.key === 'growth'; });
    var mIdx = DRIVERS.findIndex(function (d) { return d.key === 'exitMultiple'; });

    var v = {}, z = new Array(DRIVERS.length), flags = new Array(events.length), equity0 = NaN;
    for (var i = 0; i < N; i++) {
      var k;
      for (k = 0; k < DRIVERS.length; k++) z[k] = gauss();
      z[mIdx] = rho * z[gIdx] + rhoC * z[mIdx];   // growth and exit multiple move together
      for (k = 0; k < DRIVERS.length; k++) {
        var def = DRIVERS[k];
        var val = clamp(splitNormal(ranges[k], z[k]), def.min, def.max);
        X[k][i] = val; v[def.key] = val;
      }
      for (k = 0; k < events.length; k++) {
        var hit = rng() < events[k].prob / 100;
        flags[k] = hit; F[k][i] = hit ? 1 : 0;
      }
      var res = evaluate(deal, v, events, flags, false);
      moic[i] = res.moic; irr[i] = res.irr; npv[i] = res.npv; eqT[i] = res.equityT;
      equity0 = res.equity0;
    }
    return { N: N, X: X, F: F, ranges: ranges, moic: moic, irr: irr, npv: npv, equityT: eqT, equity0: equity0 };
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------
  function decisionLabel(meanNpv, equity0) {
    var band = 0.02 * equity0;
    if (meanNpv > band) return { code: 'clears', text: 'Clears the hurdle at this price' };
    if (meanNpv < -band) return { code: 'short', text: 'Falls short of the hurdle at this price' };
    return { code: 'close', text: 'Too close to call at this price' };
  }

  // Find where a fitted E[NPV | x] crosses zero inside [lo, hi]; prefer the
  // crossing nearest the base value.
  function findFlip(predict, lo, hi, base) {
    var steps = 240, prevX = lo, prevY = predict(lo), best = null;
    for (var s = 1; s <= steps; s++) {
      var x = lo + (hi - lo) * s / steps, y = predict(x);
      if ((prevY <= 0 && y > 0) || (prevY >= 0 && y < 0)) {
        var a = prevX, b = x, fa = prevY;
        for (var it = 0; it < 40; it++) {
          var mid = (a + b) / 2, fm = predict(mid);
          if ((fa <= 0 && fm <= 0) || (fa > 0 && fm > 0)) { a = mid; fa = fm; } else { b = mid; }
        }
        var root = (a + b) / 2;
        var dir = y > prevY ? 'above' : 'below';     // side of the root where E[NPV] > 0
        if (!best || Math.abs(root - base) < Math.abs(best.value - base)) best = { value: root, goodSide: dir };
      }
      prevX = x; prevY = y;
    }
    return best;
  }

  // Holding everything else at base (no risk events), what value of this driver
  // gives exactly `goal` MOIC?
  function solveThreshold(model, key, goal) {
    var def = DRIVER_BY_KEY[key], v = baseValues(model);
    function f(x) { v[key] = x; return evaluate(model.deal, v, model.events, null, false).moic - goal; }
    var lo = def.min, hi = def.max, flo = f(lo), fhi = f(hi), fb = f(model.drivers[key].base);
    var higherBetter = fhi > flo;
    if (flo === fhi) return { reachable: false, higherBetter: true, met: fb >= 0 };
    if ((flo < 0 && fhi < 0) || (flo > 0 && fhi > 0)) return { reachable: false, higherBetter: higherBetter, met: fb >= 0 };
    for (var it = 0; it < 80; it++) {
      var mid = (lo + hi) / 2, fm = f(mid);
      if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else { hi = mid; }
    }
    return { reachable: true, value: (lo + hi) / 2, higherBetter: higherBetter, met: fb >= 0 };
  }

  function analyze(model) {
    var errors = validate(model);
    if (errors.length) return { ok: false, errors: errors };

    var deal = model.deal, events = model.events || [];
    var sim = simulate(model);
    var N = sim.N;
    var base = evaluate(deal, baseValues(model), events, null, true);

    var sortedMoic = sortedCopy(sim.moic);
    var sortedIrr = sortedCopy(sim.irr);
    var meanNpv = mean(sim.npv), varNpv = variance(sim.npv, meanNpv), sdNpv = Math.sqrt(varNpv);
    var pLoss = 0, pTarget = 0, pWipe = 0, evPos = 0;
    for (var i = 0; i < N; i++) {
      if (sim.moic[i] < 1) pLoss++;
      if (sim.moic[i] >= deal.targetMoic) pTarget++;
      if (sim.moic[i] <= 0.05) pWipe++;
      evPos += Math.max(sim.npv[i], 0);
    }
    pLoss /= N; pTarget /= N; pWipe /= N;
    var evpi = Math.max(0, evPos / N - Math.max(meanNpv, 0));

    // Walk-away price: entry multiple where expected NPV at the hurdle is zero.
    // Equity at exit doesn't depend on the entry price (debt is sized in turns of
    // EBITDA), so this has a closed form on the same simulated worlds.
    var T = Math.max(1, Math.round(deal.hold));
    var disc = Math.pow(1 + deal.hurdle / 100, T);
    var walkAway = (mean(sim.equityT) / disc + deal.ebitda * deal.leverage) / (deal.ebitda * (1 + deal.feesPct / 100));

    // ---- Value of information, one unknown at a time -------------------------
    var items = [];
    var floorSd3 = sdNpv * Math.sqrt(3 / N), floorSd1 = sdNpv * Math.sqrt(1 / N);
    // Anything below 0.1% of the equity cheque is immaterial to a deal team,
    // and also covers small artefacts from the cubic fit in the far tails.
    var material = 0.001 * sim.equity0;
    DRIVERS.forEach(function (def, k) {
      var st = model.drivers[def.key], rg = sim.ranges[k], x = sim.X[k];
      var item = {
        kind: 'driver', key: def.key, label: def.label, short: def.short, unit: def.unit,
        conf: st.conf, source: st.source || '', cost: isNum(st.cost) ? st.cost : null,
        question: def.question, base: st.base, p10: rg.p10, p90: rg.p90,
        evppi: 0, share: 0, flip: null, pWrongSide: null, noise: true
      };
      var fit = (rg.p90 - rg.p10) > 1e-9 ? cubicFit(x, sim.npv) : null;
      if (fit) {
        var s = 0, vg = 0, j;
        for (j = 0; j < N; j++) s += Math.max(fit.fitted[j], 0);
        var raw = s / N - Math.max(meanNpv, 0);
        vg = variance(fit.fitted, meanNpv);
        item.evppi = Math.max(0, raw);
        item.share = varNpv > 0 ? clamp(vg / varNpv, 0, 1) : 0;
        item.noise = item.evppi <= Math.max(1.5 * noiseFloor(meanNpv, floorSd3), material);
        var xs = sortedCopy(x), lo = quantileSorted(xs, 0.01), hi = quantileSorted(xs, 0.99);
        var flip = findFlip(fit.predict, lo, hi, st.base);
        if (flip) {
          var wrong = 0;
          for (j = 0; j < N; j++) {
            if (flip.goodSide === 'above' ? x[j] < flip.value : x[j] > flip.value) wrong++;
          }
          item.flip = flip; item.pWrongSide = wrong / N;
        }
      }
      items.push(item);
    });

    events.forEach(function (ev, k) {
      var f = sim.F[k], n1 = 0, s1 = 0, s0 = 0;
      for (var j = 0; j < N; j++) { if (f[j]) { n1++; s1 += sim.npv[j]; } else s0 += sim.npv[j]; }
      var n0 = N - n1;
      var item = {
        kind: 'event', key: ev.id, label: ev.name || ('Risk ' + (k + 1)), short: ev.name || ('Risk ' + (k + 1)),
        conf: null, source: ev.source || '', cost: isNum(ev.cost) ? ev.cost : null,
        question: ev.question || ('Resolve before signing: ' + (ev.name || 'this risk') + '.'),
        prob: ev.prob, impact: ev.impact, size: ev.size,
        evppi: 0, share: 0, flip: null, pWrongSide: null, noise: true, npvIf: null, npvIfNot: null
      };
      if (n1 > 0 && n0 > 0) {
        var m1 = s1 / n1, m0 = s0 / n0, p1 = n1 / N, p0 = n0 / N;
        var raw = p1 * Math.max(m1, 0) + p0 * Math.max(m0, 0) - Math.max(meanNpv, 0);
        item.evppi = Math.max(0, raw);
        item.share = varNpv > 0 ? clamp(p1 * p0 * (m1 - m0) * (m1 - m0) / varNpv, 0, 1) : 0;
        item.noise = item.evppi <= Math.max(1.5 * noiseFloor(meanNpv, floorSd1), material);
        item.npvIf = m1; item.npvIfNot = m0;
        if ((m1 > 0) !== (m0 > 0)) item.flip = { value: null, goodSide: m0 > 0 ? 'not' : 'happens' };
      }
      items.push(item);
    });

    items.forEach(function (it) {
      it.roi = it.cost && it.cost > 0 && !it.noise ? it.evppi / it.cost : null;
    });
    var queue = items.slice().sort(function (a, b) {
      var av = a.noise ? 0 : a.evppi, bv = b.noise ? 0 : b.evppi;
      if (Math.abs(bv - av) > 1e-9) return bv - av;
      return b.share - a.share;
    });

    // ---- Pre-mortem: what the losing worlds have in common -------------------
    var order = Array.from({ length: N }, function (_, j) { return j; });
    order.sort(function (a, b) { return sim.moic[a] - sim.moic[b]; });
    var nWorst = Math.max(1, Math.floor(N * 0.1));
    var worst = order.slice(0, nWorst);
    var worstMoicCut = sim.moic[order[nWorst - 1]];
    var premortem = { cutoff: worstMoicCut, share: nWorst / N, drivers: [], events: [] };
    DRIVERS.forEach(function (def, k) {
      var x = sim.X[k], mAll = mean(x), sd = Math.sqrt(variance(x, mAll)), s = 0;
      for (var j = 0; j < nWorst; j++) s += x[worst[j]];
      var mW = s / nWorst;
      premortem.drivers.push({
        key: def.key, label: def.short, unit: def.unit, base: model.drivers[def.key].base,
        meanAll: mAll, meanWorst: mW, shift: mW - mAll, z: sd > 1e-12 ? (mW - mAll) / sd : 0
      });
    });
    events.forEach(function (ev, k) {
      var f = sim.F[k], cAll = 0, cW = 0, j;
      for (j = 0; j < N; j++) cAll += f[j];
      for (j = 0; j < nWorst; j++) cW += f[worst[j]];
      premortem.events.push({ key: ev.id, label: ev.name || ('Risk ' + (k + 1)), rateAll: cAll / N, rateWorst: cW / nWorst });
    });
    premortem.drivers.sort(function (a, b) { return Math.abs(b.z) - Math.abs(a.z); });
    premortem.events.sort(function (a, b) { return (b.rateWorst - b.rateAll) - (a.rateWorst - a.rateAll); });

    // ---- What you have to believe -------------------------------------------
    var believe = DRIVERS.map(function (def, k) {
      var rg = sim.ranges[k];
      function odds(th) {
        if (!th.reachable) return null;
        var c = splitCdf(rg, th.value);
        return th.higherBetter ? 1 - c : c;
      }
      var tgt = solveThreshold(model, def.key, deal.targetMoic);
      var one = solveThreshold(model, def.key, 1);
      return {
        key: def.key, label: def.short, unit: def.unit, base: model.drivers[def.key].base,
        target: tgt, oddsTarget: odds(tgt), money: one, oddsMoney: odds(one)
      };
    });

    // ---- Histogram data -----------------------------------------------------
    var hiCut = Math.max(deal.targetMoic * 1.25, quantileSorted(sortedMoic, 0.99));
    var binW = niceStep(hiCut / 36);
    var nb = Math.max(1, Math.ceil(hiCut / binW));
    var bins = [];
    for (var b = 0; b < nb; b++) bins.push({ lo: b * binW, hi: (b + 1) * binW, count: 0 });
    var overflow = 0;
    for (i = 0; i < N; i++) {
      var idx = Math.floor(sim.moic[i] / binW);
      if (idx >= nb) { overflow++; idx = nb - 1; }
      bins[Math.max(0, idx)].count++;
    }

    var pct = {};
    [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].forEach(function (q) {
      pct[q] = { moic: quantileSorted(sortedMoic, q), irr: quantileSorted(sortedIrr, q) };
    });

    return {
      ok: true,
      N: N,
      equity0: sim.equity0,
      base: base,
      stats: {
        meanMoic: mean(sim.moic), p10: pct[0.1].moic, p50: pct[0.5].moic, p90: pct[0.9].moic,
        irrP10: pct[0.1].irr, irrP50: pct[0.5].irr, irrP90: pct[0.9].irr,
        pLoss: pLoss, pTarget: pTarget, pWipe: pWipe, meanNpv: meanNpv, sdNpv: sdNpv,
        percentiles: pct
      },
      decision: decisionLabel(meanNpv, sim.equity0),
      evpi: evpi,
      walkAway: walkAway,
      queue: queue,
      premortem: premortem,
      believe: believe,
      histogram: { bins: bins, binW: binW, overflow: overflow, N: N }
    };
  }

  function niceStep(raw) {
    if (!(raw > 0)) return 0.1;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }

  // ---------------------------------------------------------------------------
  // Illustrative sample deal (a made-up company, for demonstration only)
  // ---------------------------------------------------------------------------
  function sampleModel() {
    return {
      version: 1,
      deal: {
        name: 'Project Kestrel (illustrative)',
        note: 'A made-up mid-market buyout of a specialty packaging maker, used to show how the tool works. Not a real company.',
        currency: 'INR_CR',
        revenue: 400,
        ebitda: 72,
        entryMultiple: 11,
        leverage: 3,
        feesPct: 2.5,
        hold: 5,
        hurdle: 20,
        targetMoic: 2.5,
        samples: 5000,
        seed: 7,
        rhoGM: 0.3
      },
      drivers: {
        qoe: { base: 94, conf: 'M', auto: true, source: 'Management-adjusted EBITDA with six add-backs. No QoE report yet.', cost: 0.6 },
        growth: { base: 14, conf: 'L', auto: true, source: 'Management plan. The last two years grew at 11%.', cost: 1.2 },
        marginDelta: { base: 2.5, conf: 'M', auto: true, source: 'Procurement savings in the plan; one supplier contract signed.', cost: 0.4 },
        exitMultiple: { base: 10, conf: 'L', auto: true, source: 'Listed peers trade at 8x to 13x. No exit in this size band since 2022.', cost: 0.25 },
        cashConversion: { base: 55, conf: 'M', auto: true, source: 'FY25 was a heavy capex year; maintenance capex not split out.', cost: 0.3 },
        interestRate: { base: 10.5, conf: 'H', auto: true, source: 'Signed term sheet from the lead lender.', cost: null }
      },
      events: [
        {
          id: 'e1', name: 'Top customer (22% of revenue) does not renew in 2027', prob: 20, impact: 'revenue', size: 18,
          source: 'Contract ends March 2027. We have not spoken to the customer.', cost: 0.1,
          question: 'Get a customer call before signing, or make a renewal letter a condition of closing.'
        },
        {
          id: 'e2', name: 'Plastic packaging rules tighten before exit', prob: 30, impact: 'margin', size: 2,
          source: 'Draft rules in consultation. Timing and pass-through are both unclear.', cost: 0.35,
          question: 'Commission a regulatory memo on timing, and test how much of the cost customers would absorb.'
        },
        {
          id: 'e3', name: 'Promoter dispute over the factory land parcel', prob: 10, impact: 'cash', size: 40,
          source: 'Mentioned in the information memo footnotes. No legal opinion yet.', cost: 0.15,
          question: 'Get a title and litigation opinion, and cover the exposure with an indemnity or escrow.'
        }
      ]
    };
  }

  // Turn an imported or restored object into a complete, well-typed model.
  // Missing numbers fall back to the sample deal; text never does, so an
  // imported deal is never mislabelled with the sample's name or notes.
  function normalizeModel(raw) {
    if (!raw || typeof raw !== 'object' || !raw.deal || !raw.drivers) {
      throw new Error('This is not a Diligence Compass deal file: it needs "deal" and "drivers" sections.');
    }
    var s = sampleModel();
    function num(v, dflt) {
      if (v === null || v === undefined || v === '') return dflt;
      var n = typeof v === 'number' ? v : parseFloat(v);
      return isNum(n) ? n : dflt;
    }
    function str(v) { return typeof v === 'string' ? v.slice(0, 400) : ''; }
    var out = { version: 1, deal: {}, drivers: {}, events: [] };
    Object.keys(s.deal).forEach(function (k) {
      var sv = s.deal[k], v = raw.deal[k];
      out.deal[k] = typeof sv === 'number' ? num(v, sv) : str(v);
    });
    if (!CURRENCIES[out.deal.currency]) out.deal.currency = 'USD_M';
    DRIVERS.forEach(function (def) {
      var st = raw.drivers[def.key] || {}, dflt = s.drivers[def.key];
      out.drivers[def.key] = {
        base: clamp(num(st.base, dflt.base), def.min, def.max),
        conf: st.conf === 'H' || st.conf === 'M' || st.conf === 'L' ? st.conf : 'M',
        auto: st.auto !== false,
        p10: num(st.p10, null),
        p90: num(st.p90, null),
        source: str(st.source),
        cost: num(st.cost, null)
      };
    });
    var evs = Array.isArray(raw.events) ? raw.events.slice(0, 24) : [];
    out.events = evs.map(function (ev, i) {
      ev = ev || {};
      return {
        id: str(ev.id) || ('e' + (i + 1)),
        name: str(ev.name),
        prob: clamp(num(ev.prob, 0), 0, 100),
        impact: IMPACTS[ev.impact] ? ev.impact : 'revenue',
        size: num(ev.size, 0),
        source: str(ev.source),
        cost: num(ev.cost, null),
        question: str(ev.question)
      };
    });
    return out;
  }

  function formatMoney(x, currency, digits) {
    var c = CURRENCIES[currency] || CURRENCIES.USD_M;
    if (!isNum(x)) return '—';
    var d = digits != null ? digits : (Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2);
    var s = Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (x < 0 ? '−' : '') + c.prefix + s + c.suffix;
  }

  return {
    DRIVERS: DRIVERS,
    DRIVER_BY_KEY: DRIVER_BY_KEY,
    IMPACTS: IMPACTS,
    CONFIDENCE: CONFIDENCE,
    CURRENCIES: CURRENCIES,
    rangeFor: rangeFor,
    splitCdf: splitCdf,
    evaluate: evaluate,
    baseValues: baseValues,
    validate: validate,
    simulate: simulate,
    analyze: analyze,
    solveThreshold: solveThreshold,
    cubicFit: cubicFit,
    sampleModel: sampleModel,
    normalizeModel: normalizeModel,
    formatMoney: formatMoney,
    _internal: { mulberry32: mulberry32, normCdf: normCdf, quantileSorted: quantileSorted, noiseFloor: noiseFloor, niceStep: niceStep }
  };
});
