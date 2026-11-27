/* Diligence Compass — interface. Depends on engine.js (window.DiligenceEngine). */
(function () {
  'use strict';

  var E = window.DiligenceEngine;
  var STORE_KEY = 'diligence-compass:v1';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var model = null, analysis = null, timer = null, histWidth = 0, histActive = -1;

  var DEAL_FIELDS = [
    { key: 'revenue', label: 'Revenue, last 12 months', unit: 'ccy', step: 1 },
    { key: 'ebitda', label: 'Headline EBITDA (adjusted)', unit: 'ccy', step: 0.5,
      derived: function (d) { return (d.ebitda / d.revenue * 100).toFixed(1) + '% margin on revenue'; } },
    { key: 'entryMultiple', label: 'Entry price, EV / EBITDA', unit: 'x', step: 0.25,
      derived: function (d) { return 'Enterprise value ' + money(d.ebitda * d.entryMultiple); } },
    { key: 'leverage', label: 'Debt at close, x EBITDA', unit: 'x', step: 0.25,
      derived: function (d) { return money(d.ebitda * d.leverage) + ' of acquisition debt'; } },
    { key: 'feesPct', label: 'Deal fees, % of EV', unit: '%', step: 0.25 },
    { key: 'hold', label: 'Hold period', unit: 'years', step: 1 },
    { key: 'hurdle', label: 'Hurdle rate, per year', unit: '%', step: 0.5 },
    { key: 'targetMoic', label: 'Target multiple of money', unit: 'x', step: 0.1 }
  ];

  // ---------------------------------------------------------------------------
  // DOM helpers (user text always goes in through textContent)
  // ---------------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') el.setAttribute('style', v);
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function sv(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------
  function cur() { return E.CURRENCIES[model.deal.currency] || E.CURRENCIES.USD_M; }
  function ccyUnit() { var c = cur(); return (c.prefix + ' ' + c.suffix.trim()).trim(); }
  function money(x, d) { return E.formatMoney(x, model.deal.currency, d); }
  function signedMoney(x) { return (x > 0 ? '+' : '') + money(x); }
  function pct(p, d) { return isFinite(p) ? (p * 100).toFixed(d == null ? 0 : d) + '%' : '—'; }
  function share(p) { return p > 0 && p < 0.01 ? 'under 1%' : pct(p); }
  function odds(p) {
    if (p === null || p === undefined || !isFinite(p)) return '—';
    if (p >= 0.995) return '>99%';
    if (p <= 0.005) return '<1%';
    return Math.round(p * 100) + '%';
  }
  function xm(v, d) { return isFinite(v) ? v.toFixed(d == null ? 2 : d) + 'x' : '—'; }
  function irr(v) {
    if (!isFinite(v)) return '—';
    if (v <= -0.999) return '−100%';
    return (v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(1) + '%';
  }
  function dv(unit, v) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (unit === '%') return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';
    if (unit === 'pts') return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' pts';
    if (unit === 'x') return v.toFixed(1) + 'x';
    return String(v);
  }
  function impactText(ev) {
    var s = Math.abs(ev.size), down = ev.size >= 0;
    switch (ev.impact) {
      case 'revenue': return (down ? '−' : '+') + s + '% on exit revenue';
      case 'margin': return (down ? '−' : '+') + s + ' pts on exit margin';
      case 'multiple': return (down ? '−' : '+') + s + 'x on the exit multiple';
      case 'cash': return down ? money(s) + ' one-off cash cost' : money(s) + ' one-off cash gain';
      default: return '';
    }
  }
  function listJoin(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function inputVal(v) { return v === null || v === undefined || !isFinite(v) ? '' : String(+(+v).toFixed(4)); }
  function itemName(it) { return it.kind === 'driver' ? it.short : it.label; }

  // ---------------------------------------------------------------------------
  // Persistence (per-browser convenience only)
  // ---------------------------------------------------------------------------
  var storageOK = false;
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(model)); storageOK = true; } catch (e) { storageOK = false; }
    $('#save-state').textContent = storageOK ? 'Saved in this browser only' : '';
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return E.normalizeModel(JSON.parse(raw));
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------------------
  // Input wiring
  // ---------------------------------------------------------------------------
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 140);
  }

  // Parse a number field. Empty is allowed only when `optional`.
  function readNum(input, optional) {
    var raw = input.value.trim();
    if (raw === '' && optional) { input.removeAttribute('aria-invalid'); return { ok: true, value: null }; }
    var v = parseFloat(raw);
    if (!isFinite(v)) { input.setAttribute('aria-invalid', 'true'); return { ok: false }; }
    input.removeAttribute('aria-invalid');
    return { ok: true, value: v };
  }

  function bindNum(input, apply, optional) {
    input.addEventListener('input', function () {
      var r = readNum(input, optional);
      if (!r.ok) return;
      apply(r.value);
      schedule();
    });
  }

  function buildCurrency() {
    var sel = $('#deal-currency');
    Object.keys(E.CURRENCIES).forEach(function (k) {
      sel.appendChild(h('option', { value: k, text: E.CURRENCIES[k].label }));
    });
    sel.addEventListener('change', function () { model.deal.currency = sel.value; updateUnits(); schedule(); });
  }

  function buildDealFields() {
    var host = $('#deal-fields');
    DEAL_FIELDS.forEach(function (f) {
      var id = 'deal-' + f.key;
      var input = h('input', { type: 'number', id: id, step: f.step, inputmode: 'decimal' });
      bindNum(input, function (v) { model.deal[f.key] = v; });
      var row = h('div', { class: 'field' },
        h('label', { for: id, text: f.label }),
        h('span', { class: 'num' }, input, h('span', { class: 'unit', 'data-unit': f.unit })));
      if (f.derived) row.appendChild(h('span', { class: 'derived', id: id + '-derived' }));
      host.appendChild(row);
    });
    var nameIn = $('#deal-name-input');
    nameIn.addEventListener('input', function () {
      model.deal.name = nameIn.value;
      model.deal.note = '';
      schedule();
    });
    bindNum($('#sim-rho'), function (v) { model.deal.rhoGM = Math.max(-0.9, Math.min(0.9, v)); });
    bindNum($('#sim-seed'), function (v) { model.deal.seed = Math.max(1, Math.round(v)); });
    $('#sim-samples').addEventListener('change', function () { model.deal.samples = +$('#sim-samples').value; schedule(); });
  }

  function buildDrivers() {
    var host = $('#drivers');
    E.DRIVERS.forEach(function (def) {
      var k = def.key, id = 'd-' + k;
      function st() { return model.drivers[k]; }

      var baseIn = h('input', { type: 'number', id: id + '-base', step: def.step, inputmode: 'decimal' });
      bindNum(baseIn, function (v) { st().base = v; syncRange(k); });

      var conf = h('div', { class: 'conf', role: 'radiogroup', 'aria-label': 'How sure you are of ' + def.short.toLowerCase() });
      ['H', 'M', 'L'].forEach(function (c) {
        var rid = id + '-c' + c;
        var r = h('input', { type: 'radio', name: id + '-conf', id: rid, value: c });
        r.addEventListener('change', function () {
          if (!r.checked) return;
          st().conf = c; st().auto = true;
          syncRange(k); schedule();
        });
        conf.appendChild(r);
        conf.appendChild(h('label', { for: rid, 'data-c': c, title: E.CONFIDENCE[c].long, text: E.CONFIDENCE[c].label }));
      });

      var p10 = h('input', { type: 'number', id: id + '-p10', step: def.step, inputmode: 'decimal', 'aria-label': def.short + ', pessimistic case (P10)' });
      var p90 = h('input', { type: 'number', id: id + '-p90', step: def.step, inputmode: 'decimal', 'aria-label': def.short + ', optimistic case (P90)' });
      function makeCustom() {
        var s = st();
        if (s.auto !== false) {
          var r = E.rangeFor(def, s);
          s.p10 = r.p10; s.p90 = r.p90;
        }
        s.auto = false;
      }
      bindNum(p10, function (v) { makeCustom(); st().p10 = v; syncCustomTag(k); });
      bindNum(p90, function (v) { makeCustom(); st().p90 = v; syncCustomTag(k); });

      var tag = h('span', { class: 'tag-custom', id: id + '-custom', text: 'Your range' });
      var reset = h('button', {
        type: 'button', class: 'link-btn', id: id + '-reset', text: 'Use the confidence default',
        onclick: function () { st().auto = true; syncRange(k); schedule(); }
      });

      var source = h('input', { type: 'text', id: id + '-source', placeholder: 'Source: where this number comes from', autocomplete: 'off' });
      source.addEventListener('input', function () { st().source = source.value; schedule(); });
      var cost = h('input', { type: 'number', id: id + '-cost', step: 0.05, min: 0, inputmode: 'decimal', 'aria-label': 'Cost to check ' + def.short.toLowerCase() });
      bindNum(cost, function (v) { st().cost = v; }, true);

      host.appendChild(h('div', { class: 'ledger-row', 'data-key': k },
        h('div', { class: 'lr-head' },
          h('label', { class: 'lr-label', for: id + '-base', text: def.label }),
          h('span', { class: 'num' }, baseIn, h('span', { class: 'unit', text: def.unit }))),
        h('p', { class: 'lr-hint', text: def.hint }),
        h('div', { class: 'lr-line' }, conf),
        h('div', { class: 'lr-line' },
          h('span', { class: 'mini', 'aria-hidden': 'true', text: 'Range P10' }), p10,
          h('span', { class: 'mini', 'aria-hidden': 'true', text: 'to P90' }), p90,
          tag, reset),
        h('label', { class: 'sr-only', for: id + '-source', text: 'Source for ' + def.short.toLowerCase() }),
        source,
        h('div', { class: 'lr-line' },
          h('span', { class: 'mini', text: 'Cost to check' }), cost,
          h('span', { class: 'unit', 'data-unit': 'ccy' }))));
    });
  }

  function syncRange(k) {
    var def = E.DRIVER_BY_KEY[k], s = model.drivers[k], id = 'd-' + k;
    var r = E.rangeFor(def, s);
    var p10 = $('#' + id + '-p10'), p90 = $('#' + id + '-p90');
    if (document.activeElement !== p10) { p10.value = inputVal(r.p10); p10.removeAttribute('aria-invalid'); }
    if (document.activeElement !== p90) { p90.value = inputVal(r.p90); p90.removeAttribute('aria-invalid'); }
    syncCustomTag(k);
  }
  function syncCustomTag(k) {
    var custom = model.drivers[k].auto === false;
    $('#d-' + k + '-custom').hidden = !custom;
    $('#d-' + k + '-reset').hidden = !custom;
  }
  function syncDriver(k) {
    var s = model.drivers[k], id = 'd-' + k;
    $('#' + id + '-base').value = inputVal(s.base);
    var radio = $('#' + id + '-c' + s.conf);
    if (radio) radio.checked = true;
    $('#' + id + '-source').value = s.source || '';
    $('#' + id + '-cost').value = inputVal(s.cost);
    syncRange(k);
  }

  function newId() { return 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  function renderEvents() {
    var host = $('#events');
    clear(host);
    if (!model.events.length) {
      host.appendChild(h('p', { class: 'fs-note', text: 'No risks yet. Add one for each yes-or-no question diligence has raised.' }));
    }
    model.events.forEach(function (ev, i) {
      var id = 'ev-' + ev.id;
      var name = h('input', { type: 'text', id: id + '-name', value: ev.name, autocomplete: 'off', 'aria-label': 'Risk ' + (i + 1) + ' name' });
      name.addEventListener('input', function () { ev.name = name.value; schedule(); });
      var remove = h('button', {
        type: 'button', class: 'btn icon', 'aria-label': 'Remove risk: ' + (ev.name || 'risk ' + (i + 1)), text: 'Remove',
        onclick: function () { model.events.splice(model.events.indexOf(ev), 1); renderEvents(); schedule(); }
      });
      var prob = h('input', { type: 'number', id: id + '-prob', value: inputVal(ev.prob), step: 1, min: 0, max: 100, inputmode: 'decimal', 'aria-label': 'Chance it happens, percent' });
      bindNum(prob, function (v) { ev.prob = Math.max(0, Math.min(100, v)); });
      var sel = h('select', { id: id + '-impact', 'aria-label': 'What it hits' });
      Object.keys(E.IMPACTS).forEach(function (key) {
        var o = h('option', { value: key, text: E.IMPACTS[key].label });
        if (key === ev.impact) o.selected = true;
        sel.appendChild(o);
      });
      var sizeUnit = h('span', { class: 'unit' });
      function setSizeUnit() {
        var u = E.IMPACTS[ev.impact].unit;
        sizeUnit.textContent = u === 'ccy' ? ccyUnit() : u;
        sizeUnit.setAttribute('data-unit', u);
      }
      sel.addEventListener('change', function () { ev.impact = sel.value; setSizeUnit(); schedule(); });
      var size = h('input', { type: 'number', id: id + '-size', value: inputVal(ev.size), step: 0.5, inputmode: 'decimal', 'aria-label': 'Size of the hit' });
      bindNum(size, function (v) { ev.size = v; });
      setSizeUnit();
      var source = h('input', { type: 'text', id: id + '-source', value: ev.source || '', placeholder: 'Source: what diligence found', autocomplete: 'off', 'aria-label': 'Source for this risk' });
      source.addEventListener('input', function () { ev.source = source.value; schedule(); });
      var cost = h('input', { type: 'number', id: id + '-cost', value: inputVal(ev.cost), step: 0.05, min: 0, inputmode: 'decimal', 'aria-label': 'Cost to check this risk' });
      bindNum(cost, function (v) { ev.cost = v; }, true);

      host.appendChild(h('div', { class: 'event-row' },
        h('div', { class: 'ev-head' }, name, remove),
        h('div', { class: 'lr-line ev-line' },
          h('span', { class: 'mini', text: 'Chance' }), prob, h('span', { class: 'unit', text: '%' }),
          h('span', { class: 'mini', text: 'Hits' }), sel,
          h('span', { class: 'mini', text: 'by' }), size, sizeUnit),
        source,
        h('div', { class: 'lr-line' },
          h('span', { class: 'mini', text: 'Cost to check' }), cost,
          h('span', { class: 'unit', 'data-unit': 'ccy' }))));
    });
    updateUnits();
  }

  function updateUnits() {
    document.querySelectorAll('[data-unit]').forEach(function (el) {
      var u = el.getAttribute('data-unit');
      el.textContent = u === 'ccy' ? ccyUnit() : u;
    });
  }

  function updateDerived() {
    var d = model.deal;
    DEAL_FIELDS.forEach(function (f) {
      if (!f.derived) return;
      var el = $('#deal-' + f.key + '-derived');
      var ok = isFinite(d.ebitda) && isFinite(d.revenue) && d.revenue > 0;
      el.textContent = ok ? f.derived(d) : '';
    });
    var eq = d.ebitda * d.entryMultiple * (1 + d.feesPct / 100) - d.ebitda * d.leverage;
    $('#cheque').textContent = isFinite(eq) ? money(eq) : '—';
  }

  function syncAll() {
    var d = model.deal;
    $('#deal-name-input').value = d.name || '';
    $('#deal-currency').value = d.currency;
    DEAL_FIELDS.forEach(function (f) {
      var el = $('#deal-' + f.key);
      el.value = inputVal(d[f.key]);
      el.removeAttribute('aria-invalid');
    });
    $('#sim-rho').value = inputVal(d.rhoGM);
    $('#sim-seed').value = inputVal(d.seed);
    var sel = $('#sim-samples');
    if (!Array.prototype.some.call(sel.options, function (o) { return +o.value === d.samples; })) {
      sel.appendChild(h('option', { value: d.samples, text: Number(d.samples).toLocaleString('en-US') }));
    }
    sel.value = String(d.samples);
    E.DRIVERS.forEach(function (def) { syncDriver(def.key); });
    renderEvents();
    updateUnits();
  }

  // ---------------------------------------------------------------------------
  // Run + render
  // ---------------------------------------------------------------------------
  function run() {
    timer = null;
    save();
    updateDerived();
    var a = E.analyze(model);
    var errs = $('#errors');
    if (!a.ok) {
      clear(errs);
      a.errors.forEach(function (msg) { errs.appendChild(h('li', { text: msg })); });
      errs.hidden = false;
      var pill = $('#decision');
      pill.setAttribute('data-state', 'error');
      pill.textContent = 'Check the inputs';
      $('#outputs').classList.add('stale');
      return;
    }
    errs.hidden = true;
    $('#outputs').classList.remove('stale');
    analysis = a;
    renderSummary();
    renderQueue();
    renderHistogram();
    renderPercentiles();
    renderPremortem();
    renderBelieve();
    renderBridge();
  }

  // ---- Text generators (shared by the page and the Markdown export) --------
  function flipText(it) {
    var a = analysis, invest = a.stats.meanNpv > 0;
    if (it.kind === 'driver') {
      if (!it.flip) return 'Inside your range it does not flip the call on its own; knowing it mostly sharpens the price.';
      var v = dv(it.unit, it.flip.value);
      if (invest) {
        return (it.flip.goodSide === 'above' ? 'Below ' : 'Above ') + v +
          ', the deal stops clearing your hurdle on average. Your range gives that a ' + odds(it.pWrongSide) + ' chance.';
      }
      return (it.flip.goodSide === 'above' ? 'Above ' : 'Below ') + v +
        ', the deal clears your hurdle on average. Your range gives that a ' + odds(1 - it.pWrongSide) + ' chance.';
    }
    if (it.npvIf === null || it.npvIf === undefined) return '';
    var tail = ' (' + signedMoney(it.npvIf) + ' against the hurdle if it happens, ' + signedMoney(it.npvIfNot) + ' if not).';
    if (it.flip) {
      return (it.flip.goodSide === 'not' ? 'If it happens, the deal stops clearing your hurdle' : 'If it happens, the deal clears your hurdle') + tail;
    }
    return 'Either way, the call stays the same' + tail;
  }

  function verdictParagraphs() {
    var a = analysis, d = model.deal, q = a.queue, out = [];
    var real = q.filter(function (i) { return !i.noise; });
    var idle = q.filter(function (i) { return i.noise; });
    if (real.length) {
      var s = cap(itemName(real[0])) + ' matters more to this decision than anything else you haven\'t verified. ' + flipText(real[0]);
      if (real[1]) s += ' Next is ' + lowerFirst(itemName(real[1])) + ', worth up to ' + money(real[1].evppi) + '.';
      out.push(s);
    } else {
      out.push('No single unknown is likely to change the call at this price. Diligence here protects the downside and sharpens the price, but it won\'t flip the decision.');
    }
    if (idle.length && real.length) {
      var names = idle.map(function (i) { return lowerFirst(itemName(i)); });
      out.push(cap(listJoin(names)) + (idle.length > 1 ? ' can\'t change the call at this price, so confirm them cheaply and move on.' : ' can\'t change the call at this price, so confirm it cheaply and move on.'));
    }
    var price;
    if (a.decision.code === 'short') {
      price = 'On average the deal falls short of a ' + d.hurdle + '% hurdle at ' + xm(d.entryMultiple, 1) + ' EBITDA. It breaks even at ' + xm(a.walkAway, 1) + '.';
    } else if (a.decision.code === 'clears') {
      price = 'On average the deal clears a ' + d.hurdle + '% hurdle at ' + xm(d.entryMultiple, 1) + ' EBITDA, with room up to ' + xm(a.walkAway, 1) + '.';
    } else {
      price = 'At ' + xm(d.entryMultiple, 1) + ' EBITDA the deal sits right on a ' + d.hurdle + '% hurdle; it breaks even at ' + xm(a.walkAway, 1) + '.';
    }
    out.push(price + ' Perfect information on every unknown would be worth ' + money(a.evpi) + '.');
    return out;
  }

  function premortemParagraphs() {
    var pm = analysis.premortem, out = [];
    var movers = pm.drivers.filter(function (x) { return Math.abs(x.z) >= 0.3; }).slice(0, 3);
    var flat = pm.drivers.filter(function (x) { return Math.abs(x.z) < 0.3; });
    var evs = pm.events.filter(function (e) { return e.rateWorst - e.rateAll >= 0.04 && e.rateWorst >= e.rateAll * 1.2; });
    var s = 'In the worst 10% of outcomes the deal returns ' + xm(pm.cutoff) + ' or less.';
    if (movers.length) {
      s += ' ' + cap(movers.map(function (m) {
        return lowerFirst(m.label) + ' averages ' + dv(m.unit, m.meanWorst) + ' there, against ' + dv(m.unit, m.meanAll) + ' overall';
      }).join('; ')) + '.';
    }
    out.push({ text: s });
    evs.forEach(function (e) {
      out.push({ text: 'Risk: ' + e.label + '. It fires in ' + pct(e.rateWorst) + ' of the losing outcomes, against ' + pct(e.rateAll) + ' overall.' });
    });
    if (flat.length) {
      var names = flat.map(function (f) { return lowerFirst(f.label); });
      out.push({ quiet: true, text: cap(listJoin(names)) + (flat.length > 1 ? ' look much the same in the losing outcomes as everywhere else. They are not what sinks this deal.' : ' looks much the same in the losing outcomes as everywhere else. It is not what sinks this deal.') });
    }
    return out;
  }

  function thresholdCell(row, which) {
    var t = row[which], o = which === 'target' ? row.oddsTarget : row.oddsMoney;
    if (!t.reachable) return [t.met ? 'Holds at any level' : 'Out of reach on its own', '—'];
    return [(t.higherBetter ? 'At least ' : 'At most ') + dv(row.unit, t.value), odds(o)];
  }

  // ---- Summary ------------------------------------------------------------
  function tile(label, value, sub) {
    return h('div', { class: 'tile' },
      h('span', { class: 'tile-label', text: label }),
      h('span', { class: 'tile-value', text: value }),
      sub ? h('span', { class: 'tile-sub', text: sub }) : null);
  }

  function renderSummary() {
    var a = analysis, d = model.deal, top = a.queue[0], eq = a.equity0, st = a.stats;
    $('#deal-name').textContent = d.name || 'Untitled deal';
    var note = $('#deal-note');
    note.textContent = d.note || '';
    note.hidden = !d.note;
    var pill = $('#decision');
    pill.setAttribute('data-state', a.decision.code);
    pill.textContent = a.decision.text;

    if (top && !top.noise) {
      $('#hero-eyebrow').textContent = 'Resolve next';
      $('#hero-name').textContent = itemName(top);
      $('#hero-fig').textContent = money(top.evppi);
      $('#hero-sub').textContent = 'is the most it is worth to know this before signing: ' + pct(top.evppi / eq) + ' of the ' + money(eq) + ' equity cheque.';
    } else {
      $('#hero-eyebrow').textContent = 'Resolve next';
      $('#hero-name').textContent = 'Nothing here changes the call';
      $('#hero-fig').textContent = money(a.evpi);
      $('#hero-sub').textContent = 'is all that perfect information on every unknown is worth at this price.';
    }

    var tiles = $('#tiles');
    clear(tiles);
    add(tiles, [
      tile('Deal case', xm(a.base.moic), irr(a.base.irr) + ' IRR, no risks firing'),
      tile('Simulated median', xm(st.p50), 'P10 ' + xm(st.p10) + ' · P90 ' + xm(st.p90)),
      tile('Chance of losing money', pct(st.pLoss), 'below 1.0x'),
      tile('Chance of hitting target', pct(st.pTarget), xm(d.targetMoic, 1) + ' or better'),
      tile('Walk-away price', xm(a.walkAway, 1), 'EV ' + money(a.walkAway * d.ebitda) + ' vs ' + xm(d.entryMultiple, 1) + ' asked'),
      tile('Value against hurdle', signedMoney(st.meanNpv), 'average, at ' + d.hurdle + '% a year')
    ]);

    var vt = $('#verdict-text');
    clear(vt);
    verdictParagraphs().forEach(function (p) { vt.appendChild(h('p', { text: p })); });
  }

  // ---- Queue --------------------------------------------------------------
  function renderQueue() {
    var a = analysis, host = $('#queue');
    clear(host);
    var maxV = 0;
    a.queue.forEach(function (it) { if (!it.noise) maxV = Math.max(maxV, it.evppi); });
    a.queue.forEach(function (it, i) {
      var meta = h('div', { class: 'q-meta' });
      var line1 = h('div', null);
      if (it.kind === 'driver') {
        line1.appendChild(h('span', { class: 'chip', 'data-c': it.conf, text: E.CONFIDENCE[it.conf].label + ' confidence' }));
        line1.appendChild(document.createTextNode(' · Base ' + dv(it.unit, it.base) + ', range ' + dv(it.unit, it.p10) + ' to ' + dv(it.unit, it.p90)));
      } else {
        line1.appendChild(h('span', { class: 'chip', 'data-c': 'R', text: 'Risk' }));
        line1.appendChild(document.createTextNode(' · ' + Math.round(it.prob) + '% chance, ' + impactText(it)));
      }
      meta.appendChild(line1);
      if (it.source) meta.appendChild(h('div', { class: 'q-source', text: it.source }));
      if (it.noise) {
        meta.appendChild(h('div', { text: 'Can\'t change the call at this price. Explains ' + share(it.share) + ' of the spread in outcomes.' }));
      } else {
        meta.appendChild(h('div', { class: 'flip', text: flipText(it) }));
        meta.appendChild(h('div', { text: 'Explains ' + share(it.share) + ' of the spread in outcomes.' +
          (it.cost ? ' Costs ' + money(it.cost) + ' to check' + (it.roi ? ', so the check is worth up to ' + Math.round(it.roi).toLocaleString('en-US') + 'x its cost.' : '.') : '') }));
      }
      var body = h('div', { class: 'q-body' },
        h('div', { class: 'q-top' },
          h('span', { class: 'q-name', text: itemName(it) }),
          h('span', { class: 'q-val' }, it.noise ? '≈ 0' : money(it.evppi),
            it.noise ? null : h('small', { text: pct(it.evppi / a.equity0, 1) + ' of cheque' }))),
        h('div', { class: 'q-bar', 'aria-hidden': 'true' },
          h('span', { style: 'width:' + (maxV > 0 ? Math.max(0.5, it.evppi / maxV * 100) : 0).toFixed(2) + '%' })),
        meta,
        h('p', { class: 'q-next' }, h('b', { text: 'Next step' }), it.question || ''));
      host.appendChild(h('li', { class: 'q-item' + (it.noise ? ' noise' : '') },
        h('span', { class: 'q-rank', text: String(i + 1) }), body));
    });
  }

  // ---- Histogram ----------------------------------------------------------
  function niceStep(raw) { return E._internal.niceStep(raw); }
  function tickText(v) { return String(+v.toFixed(2)) + 'x'; }

  function renderHistogram() {
    var a = analysis, d = model.deal, host = $('#hist');
    var Hd = a.histogram, bins = Hd.bins, N = Hd.N;
    clear(host);
    var W = Math.max(300, Math.round(host.clientWidth || 640));
    histWidth = W;
    var Ht = 230, m = { t: 34, r: 14, b: 32, l: 44 };
    var pw = W - m.l - m.r, ph = Ht - m.t - m.b;
    var xMax = bins[bins.length - 1].hi;
    var maxShare = 0;
    bins.forEach(function (b) { maxShare = Math.max(maxShare, b.count / N); });
    var yStep = niceStep(maxShare / 3), yTop = Math.max(yStep, Math.ceil(maxShare / yStep - 1e-9) * yStep);
    function X(v) { return m.l + Math.min(Math.max(v, 0), xMax) / xMax * pw; }
    function Y(s) { return m.t + (1 - s / yTop) * ph; }

    var svg = sv('svg', {
      viewBox: '0 0 ' + W + ' ' + Ht, width: W, height: Ht, role: 'img', tabindex: 0, focusable: 'true',
      'aria-label': 'Histogram of the simulated multiple of money. Median ' + xm(a.stats.p50) + '. ' +
        pct(a.stats.pLoss) + ' of outcomes lose money; ' + pct(a.stats.pTarget) + ' reach ' + xm(d.targetMoic, 1) + ' or more. Use the arrow keys to read each bar.'
    });

    for (var yv = 0; yv <= yTop + 1e-9; yv += yStep) {
      svg.appendChild(sv('line', { class: yv === 0 ? 'h-axis' : 'h-grid', x1: m.l, x2: W - m.r, y1: Y(yv), y2: Y(yv) }));
      var yt = sv('text', { class: 'h-tick', x: m.l - 8, y: Y(yv) + 4, 'text-anchor': 'end' });
      yt.textContent = pct(yv, Math.abs(yStep * 100 - Math.round(yStep * 100)) > 1e-9 ? 1 : 0);
      svg.appendChild(yt);
    }
    var xStep = niceStep(xMax / (W < 520 ? 4 : 7));
        for (var xv = 0; xv <= xMax + 1e-9; xv += xStep) {
      if (Hd.overflow > 0 && X(xMax) - X(xv) < 40) break;
      var xt = sv('text', { class: 'h-tick', x: X(xv), y: Ht - 8, 'text-anchor': 'middle' });
      xt.textContent = tickText(xv);
      svg.appendChild(xt);
    }
    if (Hd.overflow > 0) {
      // The last bar also holds every outcome above the axis; say so on the axis.
      var lastBin = bins[bins.length - 1];
      var ot = sv('text', { class: 'h-tick', x: W - m.r, y: Ht - 8, 'text-anchor': 'end' });
      ot.textContent = tickText(lastBin.lo) + '+';
      svg.appendChild(ot);
    }

    var hits = [];
    bins.forEach(function (b, i) {
      var x0 = X(b.lo), x1 = X(b.hi), slot = x1 - x0;
      var bw = Math.max(1, Math.min(24, slot - 2)), bx = x0 + (slot - bw) / 2;
      var share = b.count / N, mid = (b.lo + b.hi) / 2;
      var zone = mid < 1 ? 'loss' : mid < d.targetMoic ? 'mid' : 'win';
      if (share > 0) {
        var y0 = Y(share), hh = Y(0) - y0, r = Math.min(3, bw / 2, hh);
        svg.appendChild(sv('path', {
          class: 'h-bar ' + zone, 'data-i': i,
          d: 'M' + bx + ',' + (y0 + hh) + 'V' + (y0 + r) + 'Q' + bx + ',' + y0 + ' ' + (bx + r) + ',' + y0 +
            'H' + (bx + bw - r) + 'Q' + (bx + bw) + ',' + y0 + ' ' + (bx + bw) + ',' + (y0 + r) + 'V' + (y0 + hh) + 'Z'
        }));
      }
      var hit = sv('rect', { class: 'h-hit', x: x0, y: m.t, width: Math.max(1, slot), height: ph, 'data-i': i });
      hits.push(hit);
    });

    // Reference lines: money back, and target.
    var marks = [{ v: 1, label: 'Money back 1.0x' }, { v: d.targetMoic, label: 'Target ' + xm(d.targetMoic, 1) }];
    var placed = [];
    marks.forEach(function (mk) {
      if (mk.v <= 0 || mk.v > xMax) return;
      var x = X(mk.v);
      svg.appendChild(sv('line', { class: 'h-mark', x1: x, x2: x, y1: m.t - 12, y2: Y(0) }));
      var wText = mk.label.length * 6.7;
      var anchor = 'start', tx = x + 5;
      if (tx + wText > W - 2) { anchor = 'end'; tx = x - 5; }
      placed.forEach(function (p) {
        var l = anchor === 'start' ? tx : tx - wText, rr = anchor === 'start' ? tx + wText : tx;
        if (l < p.r + 8 && rr > p.l - 8) { anchor = 'end'; tx = x - 5; }
      });
      if (anchor === 'end' && tx - wText < 0) { anchor = 'start'; tx = x + 5; }
      var lt = sv('text', { class: 'h-label', x: tx, y: m.t - 16, 'text-anchor': anchor });
      lt.textContent = mk.label;
      svg.appendChild(lt);
      placed.push({ l: anchor === 'start' ? tx : tx - wText, r: anchor === 'start' ? tx + wText : tx });
    });

    // Deal-case marker on the baseline.
    var bxm = X(a.base.moic), by = Y(0);
    svg.appendChild(sv('path', { class: 'h-tri', d: 'M' + (bxm - 6) + ',' + (by + 11) + 'L' + (bxm + 6) + ',' + (by + 11) + 'L' + bxm + ',' + (by + 2) + 'Z' }));

    hits.forEach(function (r) { svg.appendChild(r); });

    var tip = h('div', { class: 'tooltip', hidden: true, role: 'presentation' });
    function show(i) {
      histActive = i;
      var b = bins[i], share = b.count / N;
      clear(tip);
      tip.appendChild(h('strong', { text: pct(share, 1) + ' of outcomes' }));
      var last = i === bins.length - 1 && Hd.overflow > 0;
      tip.appendChild(document.createTextNode(last ? 'at ' + tickText(b.lo) + ' or more' : 'between ' + tickText(b.lo) + ' and ' + tickText(b.hi)));
      tip.hidden = false;
      var scale = host.clientWidth / W;
      var cx = X((b.lo + b.hi) / 2) * scale;
      cx = Math.max(80, Math.min(host.clientWidth - 80, cx));
      tip.style.left = cx + 'px';
      tip.style.top = (Math.min(Y(share), Y(0) - 4) * scale) + 'px';
      svg.querySelectorAll('.h-bar.active').forEach(function (el) { el.classList.remove('active'); });
      var bar = svg.querySelector('.h-bar[data-i="' + i + '"]');
      if (bar) bar.classList.add('active');
    }
    function hide() {
      tip.hidden = true;
      svg.querySelectorAll('.h-bar.active').forEach(function (el) { el.classList.remove('active'); });
    }
    svg.addEventListener('pointermove', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-i') !== null) show(+t.getAttribute('data-i'));
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('focus', function () {
      var start = histActive >= 0 && histActive < bins.length ? histActive : Math.floor(Math.min(a.stats.p50, xMax - 1e-9) / Hd.binW);
      show(Math.max(0, Math.min(bins.length - 1, start)));
    });
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var next = (histActive < 0 ? 0 : histActive) + (e.key === 'ArrowRight' ? 1 : -1);
      show(Math.max(0, Math.min(bins.length - 1, next)));
    });

    host.appendChild(svg);
    host.appendChild(tip);

    var lg = $('#hist-legend');
    clear(lg);
    add(lg, [
      h('span', null, h('i', { style: 'background:var(--bad)' }), 'Loses money · ' + pct(a.stats.pLoss)),
      h('span', null, h('i', { style: 'background:var(--zone-mid)' }), 'Below target · ' + pct(1 - a.stats.pLoss - a.stats.pTarget)),
      h('span', null, h('i', { style: 'background:var(--good)' }), 'Hits target · ' + pct(a.stats.pTarget)),
      h('span', null, h('i', { class: 'tri' }), 'Deal case ' + xm(a.base.moic))
    ]);
  }

  function renderPercentiles() {
    var t = $('#pct-table'), p = analysis.stats.percentiles;
    clear(t);
    t.appendChild(h('thead', null, h('tr', null,
      h('th', { scope: 'col', text: 'Percentile' }),
      h('th', { scope: 'col', class: 'n', text: 'Multiple of money' }),
      h('th', { scope: 'col', class: 'n', text: 'IRR' }))));
    var tb = h('tbody');
    [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].forEach(function (q) {
      tb.appendChild(h('tr', null,
        h('td', { text: 'P' + Math.round(q * 100) + (q === 0.5 ? ' (median)' : '') }),
        h('td', { class: 'n', text: xm(p[q].moic) }),
        h('td', { class: 'n', text: irr(p[q].irr) })));
    });
    t.appendChild(tb);
  }

  // ---- Pre-mortem ---------------------------------------------------------
  function renderPremortem() {
    var host = $('#pm-text'), pm = analysis.premortem;
    clear(host);
    premortemParagraphs().forEach(function (p) { host.appendChild(h('p', { class: p.quiet ? 'quiet' : null, text: p.text })); });

    var t = $('#pm-table');
    clear(t);
    t.appendChild(h('thead', null, h('tr', null,
      h('th', { scope: 'col', text: 'Assumption or risk' }),
      h('th', { scope: 'col', class: 'n', text: 'All outcomes' }),
      h('th', { scope: 'col', class: 'n', text: 'Worst 10%' }),
      h('th', { scope: 'col', class: 'n', text: 'Shift' }))));
    var tb = h('tbody');
    pm.drivers.forEach(function (r) {
      var shift = r.unit === 'x'
        ? (r.shift > 0.05 ? '+' : r.shift < -0.05 ? '−' : '') + Math.abs(r.shift).toFixed(1) + 'x'
        : dv('pts', r.shift);
      tb.appendChild(h('tr', null,
        h('td', { text: r.label }),
        h('td', { class: 'n', text: dv(r.unit, r.meanAll) }),
        h('td', { class: 'n', text: dv(r.unit, r.meanWorst) }),
        h('td', { class: 'n', text: shift })));
    });
    pm.events.forEach(function (e) {
      var diff = (e.rateWorst - e.rateAll) * 100;
      tb.appendChild(h('tr', null,
        h('td', null, e.label, h('span', { class: 'sub', text: 'Chance it fires' })),
        h('td', { class: 'n', text: pct(e.rateAll) }),
        h('td', { class: 'n', text: pct(e.rateWorst) }),
        h('td', { class: 'n', text: (diff > 0 ? '+' : diff < 0 ? '−' : '') + Math.abs(diff).toFixed(0) + ' pts' })));
    });
    t.appendChild(tb);
  }

  // ---- What you have to believe ------------------------------------------
  function renderBelieve() {
    var d = model.deal, t = $('#wyhtb-table');
    $('#wyhtb-note').textContent = 'Each row moves one assumption and holds the rest at your base case, with no risks firing. It shows the level that assumption must reach for a ' +
      xm(d.targetMoic, 1) + ' return, and for your money back. Odds come from your own range for that assumption.';
    clear(t);
    t.appendChild(h('thead', null, h('tr', null,
      h('th', { scope: 'col', text: 'Assumption' }),
      h('th', { scope: 'col', class: 'n', text: 'Your base' }),
      h('th', { scope: 'col', class: 'n', text: 'For ' + xm(d.targetMoic, 1) }),
      h('th', { scope: 'col', class: 'n', text: 'Odds' }),
      h('th', { scope: 'col', class: 'n', text: 'For money back' }),
      h('th', { scope: 'col', class: 'n', text: 'Odds' }))));
    var tb = h('tbody');
    analysis.believe.forEach(function (r) {
      var tg = thresholdCell(r, 'target'), mb = thresholdCell(r, 'money');
      tb.appendChild(h('tr', null,
        h('td', { text: r.label }),
        h('td', { class: 'n', text: dv(r.unit, r.base) }),
        h('td', { class: 'n', text: tg[0] }),
        h('td', { class: 'n', text: tg[1] }),
        h('td', { class: 'n', text: mb[0] }),
        h('td', { class: 'n', text: mb[1] })));
    });
    t.appendChild(tb);
  }

  // ---- Bridge -------------------------------------------------------------
  function bridgeRows() {
    var b = analysis.base.bridge, rows = [
      { label: 'Equity cheque, with fees', v: b.equityIn, total: true },
      { label: 'Earnings-quality gap', v: b.qoeGap },
      { label: 'Revenue growth', v: b.revenueGrowth },
      { label: 'Margin change', v: b.marginChange },
      { label: 'Exit multiple against entry', v: b.multipleChange },
      { label: 'Debt repaid from cash flow', v: b.deleverage },
      { label: 'Deal fees', v: b.fees }
    ];
    if (Math.abs(b.floor) > 1e-6) rows.push({ label: 'Equity can\'t go below zero', v: b.floor });
    rows.push({ label: 'Equity at exit', v: b.equityOut, total: true });
    return rows;
  }

  function renderBridge() {
    var host = $('#bridge'), rows = bridgeRows(), cum = 0, lo = 0, hi = 0;
    rows.forEach(function (r) {
      if (r.total) { r.from = 0; r.to = r.v; cum = r.v; }
      else { r.from = cum; r.to = cum + r.v; cum = r.to; }
      lo = Math.min(lo, r.from, r.to); hi = Math.max(hi, r.from, r.to);
    });
    var span = hi - lo || 1;
    clear(host);
    rows.forEach(function (r) {
      var left = (Math.min(r.from, r.to) - lo) / span * 100, width = Math.abs(r.to - r.from) / span * 100;
      var cls = r.total ? 'total' : r.v >= 0 ? 'up' : 'down';
      host.appendChild(h('div', { class: 'b-row' + (r.total ? ' total' : '') },
        h('span', { class: 'b-label', text: r.label }),
        h('span', { class: 'b-track', style: '--zero:' + ((0 - lo) / span * 100).toFixed(2) + '%', 'aria-hidden': 'true' },
          h('span', { class: 'b-bar ' + cls, style: 'left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%' })),
        h('span', { class: 'b-val', text: r.total ? money(r.v) : signedMoney(r.v) })));
    });
    var base = analysis.base;
    host.appendChild(h('p', { class: 'fs-note', style: 'margin-top:10px', text: 'Deal case: ' + xm(base.moic) + ' and ' + irr(base.irr) + ' IRR over ' + base.detail.T + ' years. Exit at ' + xm(base.detail.exitMultiple, 1) + ' on ' + money(base.detail.ebitdaT) + ' of EBITDA, with ' + money(base.detail.netDebtT) + ' of net debt left.' }));
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  function md(s) { return String(s === null || s === undefined ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }

  function memoMarkdown() {
    var a = analysis, d = model.deal, st = a.stats, L = [];
    var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    L.push('# ' + (d.name || 'Untitled deal') + ': diligence plan', '');
    L.push('_From Diligence Compass on ' + date + ', using ' + a.N.toLocaleString('en-US') + ' simulated outcomes (seed ' + d.seed + '). These are model outputs on the deal team\'s own ranges, not forecasts._', '');
    if (d.note) L.push('> ' + md(d.note), '');
    L.push('## Where the deal stands', '');
    L.push('- **Price:** ' + xm(d.entryMultiple, 1) + ' headline EBITDA of ' + money(d.ebitda) + ' (EV ' + money(d.ebitda * d.entryMultiple) + '). Equity cheque ' + money(a.equity0) + '.');
    L.push('- **Deal case:** ' + xm(a.base.moic) + ', ' + irr(a.base.irr) + ' IRR over ' + a.base.detail.T + ' years, with no risks firing.');
    L.push('- **Simulated:** median ' + xm(st.p50) + ' (P10 ' + xm(st.p10) + ', P90 ' + xm(st.p90) + '). ' + pct(st.pLoss) + ' chance of losing money; ' + pct(st.pTarget) + ' chance of ' + xm(d.targetMoic, 1) + ' or better.');
    L.push('- **Against a ' + d.hurdle + '% hurdle:** ' + a.decision.text.toLowerCase() + ' (' + signedMoney(st.meanNpv) + ' on average). Walk-away price ' + xm(a.walkAway, 1) + ' EBITDA.');
    L.push('- **Value of perfect information on everything:** ' + money(a.evpi) + '.', '');
    verdictParagraphs().forEach(function (p) { L.push(p, ''); });

    L.push('## Diligence queue', '');
    L.push('| # | Unknown | Confidence | Value of knowing | What flips the call | Cost to check | Next step |');
    L.push('|---|---|---|---|---|---|---|');
    a.queue.forEach(function (it, i) {
      L.push('| ' + (i + 1) + ' | ' + md(itemName(it)) + ' | ' +
        (it.kind === 'driver' ? E.CONFIDENCE[it.conf].label : 'Risk, ' + Math.round(it.prob) + '%') + ' | ' +
        (it.noise ? '≈ 0' : money(it.evppi)) + ' | ' + md(it.noise ? 'Can\'t change the call' : flipText(it)) + ' | ' +
        (it.cost ? money(it.cost) : '—') + ' | ' + md(it.question) + ' |');
    });
    L.push('');

    L.push('## Pre-mortem: how this deal loses money', '');
    premortemParagraphs().forEach(function (p) { L.push(p.text, ''); });

    L.push('## What we have to believe', '');
    L.push('One assumption at a time, the rest at base, no risks firing.', '');
    L.push('| Assumption | Base | For ' + xm(d.targetMoic, 1) + ' | Odds | For money back | Odds |');
    L.push('|---|---|---|---|---|---|');
    a.believe.forEach(function (r) {
      var tg = thresholdCell(r, 'target'), mb = thresholdCell(r, 'money');
      L.push('| ' + r.label + ' | ' + dv(r.unit, r.base) + ' | ' + tg[0] + ' | ' + tg[1] + ' | ' + mb[0] + ' | ' + mb[1] + ' |');
    });
    L.push('');

    L.push('## Where the deal-case return comes from', '');
    L.push('| Step | Amount |', '|---|---|');
    bridgeRows().forEach(function (r) { L.push('| ' + r.label + ' | ' + (r.total ? money(r.v) : signedMoney(r.v)) + ' |'); });
    L.push('');

    L.push('## Assumptions and sources as tagged', '');
    E.DRIVERS.forEach(function (def) {
      var s = model.drivers[def.key], r = E.rangeFor(def, s);
      L.push('- **' + def.short + ':** ' + dv(def.unit, s.base) + ' (P10 ' + dv(def.unit, r.p10) + ', P90 ' + dv(def.unit, r.p90) + '), ' +
        E.CONFIDENCE[s.conf].label.toLowerCase() + ' confidence' + (s.source ? '. ' + md(s.source) : '.'));
    });
    model.events.forEach(function (ev) {
      L.push('- **Risk: ' + md(ev.name || 'Unnamed') + ':** ' + Math.round(ev.prob) + '% chance, ' + impactText(ev) + (ev.source ? '. ' + md(ev.source) : '.'));
    });
    L.push('');
    return L.join('\n');
  }

  function copyOut(text, okMsg) {
    var ta = $('#export-text'), status = $('#export-status');
    ta.value = text;
    ta.hidden = false;
    function fallback() {
      ta.focus();
      ta.select();
      status.textContent = 'Your browser blocked copying here. The text is selected below: press Ctrl+C or ⌘C.';
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { status.textContent = okMsg; }, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }

  function importText(txt) {
    var status = $('#import-status');
    try {
      var obj = JSON.parse(txt);
      model = E.normalizeModel(obj);
      syncAll();
      run();
      status.textContent = 'Loaded ' + (model.deal.name || 'the deal') + '.';
    } catch (e) {
      status.textContent = 'Couldn\'t load that: ' + (e && e.message ? e.message : 'the text is not valid JSON.');
    }
  }

  function bindStatic() {
    $('#add-event').addEventListener('click', function () {
      var ev = { id: newId(), name: 'New risk', prob: 20, impact: 'revenue', size: 10, source: '', cost: null, question: '' };
      model.events.push(ev);
      renderEvents();
      var el = $('#ev-' + ev.id + '-name');
      if (el) { el.focus(); el.select(); }
      schedule();
    });

    var resetBtn = $('#reset-sample'), armed = null;
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        resetBtn.textContent = 'Replace your deal with the sample? Click again';
        armed = setTimeout(function () { armed = null; resetBtn.textContent = 'Load the sample deal'; }, 4000);
        return;
      }
      clearTimeout(armed); armed = null;
      resetBtn.textContent = 'Load the sample deal';
      model = E.sampleModel();
      syncAll();
      run();
    });

    $('#copy-memo').addEventListener('click', function () {
      if (!analysis) return;
      copyOut(memoMarkdown(), 'Copied the diligence plan. Paste it into your memo.');
    });
    $('#copy-json').addEventListener('click', function () {
      copyOut(JSON.stringify(model, null, 2), 'Copied the deal file. Anyone can paste it into the box below to load the same deal.');
    });
    $('#import-btn').addEventListener('click', function () {
      var txt = $('#import-text').value.trim();
      if (!txt) { $('#import-status').textContent = 'Paste a deal file into the box first.'; return; }
      importText(txt);
    });
    $('#import-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { importText(String(reader.result || '')); };
      reader.onerror = function () { $('#import-status').textContent = 'Couldn\'t read that file.'; };
      reader.readAsText(f);
      e.target.value = '';
    });
    $('#inputs').addEventListener('submit', function (e) { e.preventDefault(); });

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        var w = Math.round($('#hist').clientWidth);
        if (analysis && Math.abs(w - histWidth) > 4) renderHistogram();
      }).observe($('#hist'));
    }
  }

  function init() {
    model = restore() || E.sampleModel();
    buildCurrency();
    buildDealFields();
    buildDrivers();
    bindStatic();
    syncAll();
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
