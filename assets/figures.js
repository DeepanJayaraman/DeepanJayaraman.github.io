/* Interactive research figures. Vanilla JS, no dependencies.
   The statistics here are computed, not faked. */
(function () {
  "use strict";

  /* ===================== shared maths ===================== */

  // sample product-moment skewness, g1
  function skewness(x) {
    var n = x.length, i, m = 0;
    for (i = 0; i < n; i++) m += x[i];
    m /= n;
    var m2 = 0, m3 = 0, d;
    for (i = 0; i < n; i++) { d = x[i] - m; m2 += d * d; m3 += d * d * d; }
    m2 /= n; m3 /= n;
    return m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
  }

  // L-moment ratios via unbiased probability-weighted moments (Hosking)
  function lmoments(xIn) {
    var x = xIn.slice().sort(function (a, b) { return a - b; });
    var n = x.length, b0 = 0, b1 = 0, b2 = 0, b3 = 0, j;
    for (j = 1; j <= n; j++) {
      b0 += x[j - 1];
      if (j >= 2) b1 += (j - 1) / (n - 1) * x[j - 1];
      if (j >= 3) b2 += (j - 1) * (j - 2) / ((n - 1) * (n - 2)) * x[j - 1];
      if (j >= 4) b3 += (j - 1) * (j - 2) * (j - 3) / ((n - 1) * (n - 2) * (n - 3)) * x[j - 1];
    }
    b0 /= n; b1 /= n; b2 /= n; b3 /= n;
    var l1 = b0,
        l2 = 2 * b1 - b0,
        l3 = 6 * b2 - 6 * b1 + b0,
        l4 = 20 * b3 - 30 * b2 + 12 * b1 - b0;
    return { l1: l1, l2: l2, t3: l2 === 0 ? 0 : l3 / l2, t4: l2 === 0 ? 0 : l4 / l2 };
  }

  // complementary error function (Numerical Recipes erfcc, ~1.2e-7)
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + z / 2);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 +
      t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
      t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  // upper tail of chi-square, closed form for 1 and 2 degrees of freedom
  function chi2sf(X, df) {
    return df === 1 ? erfc(Math.sqrt(X / 2)) : Math.exp(-X / 2);
  }

  /* ===================== figure 1: one outlier, two estimators ===================== */

  function outlierFigure() {
    var svg = document.getElementById("outlier-fig");
    if (!svg) return;
    var range = document.getElementById("ol-range");
    var BASE = [4.1, 4.4, 4.6, 4.8, 5.0, 5.0, 5.1, 5.3, 5.5, 5.7, 6.0];
    var XMIN = 3.6, XMAX = 25, PXL = 46, PXR = 796;
    var G_BOUND = (BASE.length + 1 - 2) / Math.sqrt(BASE.length + 1 - 1); // ~3.02 for n = 12

    var dots = document.getElementById("ol-dots");
    var ticks = document.getElementById("ol-ticks");
    var NS = "http://www.w3.org/2000/svg";
    function px(v) { return PXL + (v - XMIN) / (XMAX - XMIN) * (PXR - PXL); }

    for (var t = 5; t <= 25; t += 5) {
      var ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", px(t)); ln.setAttribute("x2", px(t));
      ln.setAttribute("y1", 96); ln.setAttribute("y2", 102);
      ln.setAttribute("class", "mrd-axis"); ln.setAttribute("stroke-width", "1");
      ticks.appendChild(ln);
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", px(t)); tx.setAttribute("y", 118);
      tx.setAttribute("text-anchor", "middle"); tx.setAttribute("class", "mrd-tick");
      tx.textContent = t; ticks.appendChild(tx);
    }

    var circles = [];
    for (var i = 0; i < BASE.length + 1; i++) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("r", i === BASE.length ? 8 : 6);
      c.setAttribute("cy", 96);
      c.setAttribute("fill", i === BASE.length ? "var(--accent-2)" : "var(--muted)");
      if (i === BASE.length) { c.setAttribute("stroke", "var(--bg)"); c.setAttribute("stroke-width", "2"); }
      dots.appendChild(c); circles.push(c);
    }
    var lbl = document.createElementNS(NS, "text");
    lbl.setAttribute("class", "mrd-name"); lbl.setAttribute("y", 74);
    lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("fill", "var(--accent-2)");
    lbl.textContent = "the extreme";
    dots.appendChild(lbl);

    var baseline = null;

    function render() {
      var last = parseFloat(range.value);
      var sample = BASE.concat([last]);
      var g = skewness(sample);
      var lm = lmoments(sample);
      if (baseline === null) baseline = { g: g, t3: lm.t3 };

      for (var k = 0; k < sample.length; k++) circles[k].setAttribute("cx", px(sample[k]));
      lbl.setAttribute("x", px(last));

      document.getElementById("ol-val").textContent = last.toFixed(1);
      document.getElementById("ol-num-g").textContent = g.toFixed(2);
      document.getElementById("ol-num-t").textContent = lm.t3.toFixed(2);
      document.getElementById("ol-bar-g").style.width =
        Math.min(100, Math.abs(g) / G_BOUND * 100).toFixed(1) + "%";
      document.getElementById("ol-bar-t").style.width =
        Math.min(100, Math.abs(lm.t3) / 1 * 100).toFixed(1) + "%";

      var gPct = Math.min(100, Math.abs(g) / G_BOUND * 100);
      var tPct = Math.min(100, Math.abs(lm.t3) * 100);

      // how much does each still move for the next equal step out?
      var probe = BASE.concat([last + 2]);
      var dG = Math.abs(skewness(probe) - g);
      var dT = Math.abs(lmoments(probe).t3 - lm.t3);

      var v = document.getElementById("ol-verdict");
      if (last <= 6.3) {
        v.className = "verdict";
        v.textContent = "A well-behaved sample. Both measures agree it is close to symmetric.";
      } else if (gPct > 92 && dT > dG) {
        v.className = "verdict disagree";
        v.innerHTML = "<strong>Skewness has saturated.</strong> It is at " + gPct.toFixed(0) +
          "% of the ceiling this sample size allows, and moving the extreme two units further " +
          "would shift it by only " + dG.toFixed(3) + ". L-skewness would shift by " + dT.toFixed(3) +
          " — it is now the more informative of the two.";
      } else {
        v.className = "verdict";
        v.innerHTML = "Skewness has used <strong>" + gPct.toFixed(0) +
          "%</strong> of the range its sample size allows; L-skewness <strong>" +
          tPct.toFixed(0) + "%</strong> of its bound. Keep dragging.";
      }
    }

    range.addEventListener("input", render);
    render();
  }

  /* ===================== figure 2: L-moment ratio diagram ===================== */

  function momentRatioFigure() {
    var svg = document.getElementById("mrd-fig");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var T3MIN = -0.05, T3MAX = 0.65, T4MIN = -0.02, T4MAX = 0.42;
    var L = 62, R = 596, TOP = 34, BOT = 352;
    var SIGMA = 0.035;   // representative sampling noise in the tau plane

    function X(t3) { return L + (t3 - T3MIN) / (T3MAX - T3MIN) * (R - L); }
    function Y(t4) { return BOT - (t4 - T4MIN) / (T4MAX - T4MIN) * (BOT - TOP); }
    function invX(x) { return T3MIN + (x - L) / (R - L) * (T3MAX - T3MIN); }
    function invY(y) { return T4MIN + (BOT - y) / (BOT - TOP) * (T4MAX - T4MIN); }

    // Hosking's polynomial approximations to the three-parameter family loci
    var CURVES = [
      { key: "GLO", name: "Gen. logistic", f: function (t) { return 0.16667 + 0.83333 * t * t; } },
      { key: "GEV", name: "Gen. extreme value", f: function (t) {
          return 0.10701 + 0.11090 * t + 0.84838 * t * t - 0.06669 * Math.pow(t, 3) +
                 0.00567 * Math.pow(t, 4) - 0.04208 * Math.pow(t, 5) + 0.03763 * Math.pow(t, 6); } },
      { key: "LN3", name: "Lognormal", f: function (t) {
          return 0.12282 + 0.77518 * t * t + 0.12279 * Math.pow(t, 4) -
                 0.13638 * Math.pow(t, 6) + 0.11368 * Math.pow(t, 8); } },
      { key: "PE3", name: "Pearson III", f: function (t) {
          return 0.12240 + 0.30115 * t * t + 0.95812 * Math.pow(t, 4) -
                 0.57488 * Math.pow(t, 6) + 0.19383 * Math.pow(t, 8); } },
      { key: "GPA", name: "Gen. Pareto", f: function (t) {
          return 0.20196 * t + 0.95924 * t * t - 0.20096 * Math.pow(t, 3) + 0.04061 * Math.pow(t, 4); } }
    ];
    var POINTS = [
      { key: "N",  name: "Normal",      t3: 0,       t4: 0.1226 },
      { key: "G",  name: "Gumbel",      t3: 0.1699,  t4: 0.1504 },
      { key: "E",  name: "Exponential", t3: 0.3333,  t4: 0.1667 }
    ];

    // axes and gridlines
    var grid = document.getElementById("mrd-grid");
    function line(x1, y1, x2, y2) {
      var e = document.createElementNS(NS, "line");
      e.setAttribute("x1", x1); e.setAttribute("y1", y1);
      e.setAttribute("x2", x2); e.setAttribute("y2", y2);
      e.setAttribute("class", "mrd-axis"); e.setAttribute("stroke-width", "1");
      grid.appendChild(e);
    }
    function text(x, y, s, anchor, cls) {
      var e = document.createElementNS(NS, "text");
      e.setAttribute("x", x); e.setAttribute("y", y);
      e.setAttribute("text-anchor", anchor || "middle");
      e.setAttribute("class", cls || "mrd-tick");
      e.textContent = s; grid.appendChild(e); return e;
    }
    line(L, TOP, L, BOT); line(L, BOT, R, BOT);
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(function (t) {
      line(X(t), BOT, X(t), BOT + 5); text(X(t), BOT + 19, t.toFixed(1));
    });
    [0, 0.1, 0.2, 0.3, 0.4].forEach(function (t) {
      line(L - 5, Y(t), L, Y(t)); text(L - 10, Y(t) + 4, t.toFixed(1), "end");
    });
    text((L + R) / 2, BOT + 40, "L-skewness  τ₃", "middle", "mrd-name");
    var yl = text(0, 0, "L-kurtosis  τ₄", "middle", "mrd-name");
    yl.setAttribute("transform", "translate(20," + (TOP + BOT) / 2 + ") rotate(-90)");

    // loci
    var lociG = document.getElementById("mrd-loci");
    var pointsG = document.getElementById("mrd-points");
    CURVES.forEach(function (c) {
      var d = "", first = true;
      for (var t = 0; t <= 0.62; t += 0.005) {
        var v = c.f(t);
        if (v < T4MIN || v > T4MAX) { first = true; continue; }
        d += (first ? "M" : "L") + X(t).toFixed(1) + " " + Y(v).toFixed(1) + " ";
        first = false;
      }
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", d); path.setAttribute("class", "mrd-locus");
      path.setAttribute("data-key", c.key);
      lociG.appendChild(path); c.el = path;
      var lt = 0.55, lv = c.f(lt);
      while (lv > T4MAX && lt > 0.1) { lt -= 0.05; lv = c.f(lt); }
      var lab = document.createElementNS(NS, "text");
      lab.setAttribute("x", X(lt) + 6); lab.setAttribute("y", Y(lv) - 5);
      lab.setAttribute("class", "mrd-name"); lab.setAttribute("data-key", c.key);
      lab.textContent = c.key;
      lociG.appendChild(lab); c.lab = lab;
    });
    POINTS.forEach(function (p) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", X(p.t3)); c.setAttribute("cy", Y(p.t4)); c.setAttribute("r", 5);
      c.setAttribute("class", "mrd-pt"); pointsG.appendChild(c); p.el = c;
      var lab = document.createElementNS(NS, "text");
      lab.setAttribute("x", X(p.t3)); lab.setAttribute("y", Y(p.t4) + 20);
      lab.setAttribute("text-anchor", "middle"); lab.setAttribute("class", "mrd-name");
      lab.textContent = p.name; pointsG.appendChild(lab); p.lab = lab;
    });

    var sample = document.getElementById("mrd-sample");
    var corrected = false;
    var st3 = 0.02, st4 = 0.135;   // starts where the two criteria disagree

    function nearestOnCurve(c, t3, t4) {
      var best = Infinity, bt = 0;
      for (var t = 0; t <= 0.62; t += 0.002) {
        var v = c.f(t);
        if (v < T4MIN || v > T4MAX) continue;
        var d = Math.hypot(t - t3, v - t4);
        if (d < best) { best = d; bt = t; }
      }
      return { d: best, t: bt };
    }

    function evaluate() {
      var cands = [];
      CURVES.forEach(function (c) {
        var n = nearestOnCurve(c, st3, st4);
        cands.push({ key: c.key, name: c.name, d: n.d, df: 1, obj: c });
      });
      POINTS.forEach(function (p) {
        cands.push({ key: p.key, name: p.name, d: Math.hypot(p.t3 - st3, p.t4 - st4), df: 2, obj: p });
      });
      cands.forEach(function (k) { k.p = chi2sf(Math.pow(k.d / SIGMA, 2), k.df); });

      var byDist = cands.slice().sort(function (a, b) { return a.d - b.d; })[0];
      var byChi2 = cands.slice().sort(function (a, b) { return b.p - a.p; })[0];
      return { byDist: byDist, byChi2: byChi2, cands: cands };
    }

    function render() {
      sample.setAttribute("cx", X(st3));
      sample.setAttribute("cy", Y(st4));
      var r = evaluate();
      var winner = corrected ? r.byChi2 : r.byDist;

      CURVES.forEach(function (c) {
        var on = c.key === winner.key;
        c.el.setAttribute("class", "mrd-locus" + (on ? " hot" : ""));
        c.lab.setAttribute("class", "mrd-name" + (on ? " hot" : ""));
      });
      POINTS.forEach(function (p) {
        var on = p.key === winner.key;
        p.el.setAttribute("class", "mrd-pt" + (on ? " hot" : ""));
        p.lab.setAttribute("class", "mrd-name" + (on ? " hot" : ""));
      });

      var v = document.getElementById("mrd-verdict");
      var disagree = r.byDist.key !== r.byChi2.key;
      v.className = "verdict" + (disagree ? " disagree" : "");
      if (disagree) {
        v.innerHTML = "<strong>The two criteria disagree here.</strong> Raw distance picks <strong>" +
          r.byDist.name + "</strong> (" + (r.byDist.df === 1 ? "a curve" : "a point") +
          ", distance " + r.byDist.d.toFixed(3) + "); minimum chi-square picks <strong>" +
          r.byChi2.name + "</strong> (" + (r.byChi2.df === 1 ? "a curve" : "a point") +
          ", distance " + r.byChi2.d.toFixed(3) + "). The curve is closer, but it is also a " +
          "higher-dimensional target — distance alone rewards it for that.";
      } else {
        v.innerHTML = "Both criteria pick <strong>" + winner.name +
          "</strong>. Move the sample near a two-parameter point to see them come apart.";
      }
      sample.setAttribute("aria-valuenow", Math.round((st3 - T3MIN) / (T3MAX - T3MIN) * 100));
    }

    // dragging
    function toLocal(evt) {
      var pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    var dragging = false;
    function move(evt) {
      if (!dragging) return;
      var p = toLocal(evt);
      st3 = Math.max(T3MIN, Math.min(T3MAX, invX(p.x)));
      st4 = Math.max(T4MIN, Math.min(T4MAX, invY(p.y)));
      render();
      evt.preventDefault();
    }
    sample.addEventListener("pointerdown", function (e) {
      dragging = true; sample.setPointerCapture(e.pointerId);
    });
    sample.addEventListener("pointermove", move);
    sample.addEventListener("pointerup", function (e) {
      dragging = false; sample.releasePointerCapture(e.pointerId);
    });
    svg.addEventListener("click", function (e) {
      if (e.target === sample) return;
      var p = toLocal(e);
      if (p.x < L || p.x > R || p.y < TOP || p.y > BOT) return;
      st3 = invX(p.x); st4 = invY(p.y); render();
    });
    sample.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 0.05 : 0.01, used = true;
      if (e.key === "ArrowLeft") st3 -= step;
      else if (e.key === "ArrowRight") st3 += step;
      else if (e.key === "ArrowUp") st4 += step;
      else if (e.key === "ArrowDown") st4 -= step;
      else used = false;
      if (used) {
        st3 = Math.max(T3MIN, Math.min(T3MAX, st3));
        st4 = Math.max(T4MIN, Math.min(T4MAX, st4));
        render(); e.preventDefault();
      }
    });

    var btn = document.getElementById("mrd-correct");
    btn.addEventListener("click", function () {
      corrected = !corrected;
      btn.setAttribute("aria-pressed", corrected ? "true" : "false");
      btn.textContent = corrected ? "Showing minimum chi-square" : "Apply codimension correction";
      render();
    });

    render();
  }

  /* ===================== figure 3: method x domain matrix ===================== */

  function methodMatrix() {
    var svg = document.getElementById("method-matrix");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var panel = document.getElementById("matrix-detail");
    var DEFAULT_HTML = panel.innerHTML;

    var METHODS = ["L-moments & UQ", "Bayesian inference", "Optimisation & robust design",
                   "Machine learning", "Generative AI"];
    // columns run from the methodological core outwards to the applied domains
    var DOMAINS = ["Statistics", "Business", "Engineering", "Safety", "Entrepreneurship"];
    var DOMKEY  = ["statistics", "business", "engineering", "safety", "entrepreneurship"];

    // m = method indices, d = domain indices
    var ITEMS = [
      { t: "L-moments and Bayesian inference for probabilistic risk assessment", v: "Reliability Engineering & System Safety, 2023", m: [0,1], d: [0,2] },
      { t: "A dual surrogate driven L-moments based robust design", v: "Structural and Multidisciplinary Optimization, 2022", m: [0,2,3], d: [2] },
      { t: "L-moments-based uncertainty quantification for scarce samples", v: "Structural and Multidisciplinary Optimization, 2021", m: [0], d: [0,2] },
      { t: "Predict, explain, prescribe", v: "Decision Support Systems — under review", m: [2,3], d: [1,4] },
      { t: "A detection-pathway framework for accident precursors", v: "Accident Analysis & Prevention — under review", m: [3], d: [3] },
      { t: "Codimension bias in distance-based selection", v: "JCGS — under review", m: [0], d: [0] },
      { t: "Tail estimation versus learning-function choice", v: "Reliability Engineering & System Safety — under review", m: [0,2,3], d: [0,2] },
      { t: "LMomFit: a dependency-free toolbox for UQ in engineering reliability", v: "Advances in Engineering Software — under review", m: [0], d: [0] },
      { t: "Human-in-the-loop generative AI for safety-critical design", v: "ICoIED-2026", m: [4], d: [1,2] },
      { t: "Risk-aware process innovation using AI-augmented frameworks", v: "ICoIED-2026", m: [3,4], d: [1] },
      { t: "From intuition to intelligence: AI-driven product design", v: "DSSE Entrepreneurship Day, IIT Bombay", m: [3,4], d: [1,4] },
      { t: "L-moments enabled modified Chebyshev bounds", v: "WCSMO-14", m: [0], d: [0] },
      { t: "L-moments driven Bayesian inference for risk analysis", v: "WCSMO-14", m: [0,1], d: [0,2] },
      { t: "Uncertainty propagation using L-moments", v: "WCSMO-13, Beijing", m: [0], d: [0] },
      { t: "Robust design of a gas turbine disk", v: "ASME Turbo Expo, Oslo", m: [0,2], d: [2] },
      { t: "Decision Making under Uncertainty: a robust approach", v: "Invited talk, Rajalakshmi Engineering College, 2025", m: [0], d: [0,2] },
      { t: "Battery thermal and ageing management using ML models", v: "Invited talk, RAPID Conference 2024, Caterpillar", m: [3], d: [1,2] },
      { t: "Data Science for Industry", v: "Workshop as Programme Director, Onward Technologies", m: [3], d: [1] }
    ];

    var LX = 186, TY = 96, CW = 100, CH = 62;

    function cellItems(mi, di) {
      return ITEMS.filter(function (it) {
        return it.m.indexOf(mi) !== -1 && it.d.indexOf(di) !== -1;
      });
    }
    function el(tag, attrs, text) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (text !== undefined) e.textContent = text;
      svg.appendChild(e);
      return e;
    }

    svg.innerHTML = "";
    el("title", { id: "mxTitle" }, "Methods against domains");
    el("desc", { id: "mxDesc" }, "A grid of five methods against five domains. A filled cell means that method produced work in that domain; darker cells carry more outputs. Hover to preview a cell, row or column; click to pin it so the panel stays put.");

    var maxN = 1, a, b;
    for (a = 0; a < METHODS.length; a++) {
      for (b = 0; b < DOMAINS.length; b++) maxN = Math.max(maxN, cellItems(a, b).length);
    }

    DOMAINS.forEach(function (d, j) {
      var x = LX + j * CW + CW / 2;
      var words = d.length > 12 ? [d.slice(0, 8) + "-", d.slice(8)] : [d];
      words.forEach(function (w, k) {
        el("text", { x: x, y: TY - 32 + k * 14, "text-anchor": "middle", "class": "mx-head", "data-col": j }, w);
      });
    });
    METHODS.forEach(function (m, i) {
      el("text", { x: LX - 16, y: TY + i * CH + CH / 2 + 4, "text-anchor": "end", "class": "mx-head", "data-row": i }, m);
    });

    var cells = [];
    for (var i = 0; i < METHODS.length; i++) {
      for (var j = 0; j < DOMAINS.length; j++) {
        var items = cellItems(i, j);
        var g = document.createElementNS(NS, "g");
        g.setAttribute("class", "mx-cell" + (items.length ? "" : " empty"));
        g.setAttribute("data-row", i);
        g.setAttribute("data-col", j);
        if (items.length) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); }
        g.setAttribute("aria-label", METHODS[i] + " in " + DOMAINS[j] + ": " + items.length + " item" + (items.length === 1 ? "" : "s"));
        var r = document.createElementNS(NS, "rect");
        r.setAttribute("x", LX + j * CW + 7);
        r.setAttribute("y", TY + i * CH + 5);
        r.setAttribute("width", CW - 14);
        r.setAttribute("height", CH - 10);
        r.setAttribute("rx", 9);
        r.setAttribute("fill-opacity", items.length ? (0.20 + 0.72 * (items.length / maxN)).toFixed(2) : 0);
        g.appendChild(r);
        if (items.length) {
          var t = document.createElementNS(NS, "text");
          t.setAttribute("x", LX + j * CW + CW / 2);
          t.setAttribute("y", TY + i * CH + CH / 2 + 5);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("class", "mx-n");
          t.textContent = items.length;
          g.appendChild(t);
        }
        svg.appendChild(g);
        cells.push({ g: g, i: i, j: j, items: items });
      }
    }

    function paint(rowSel, colSel) {
      svg.querySelectorAll(".mx-cell").forEach(function (c) {
        var r = +c.getAttribute("data-row"), j = +c.getAttribute("data-col");
        var on;
        if (rowSel === null && colSel === null) on = true;
        else if (rowSel !== null && colSel !== null) on = (r === rowSel && j === colSel);
        else on = (r === rowSel || j === colSel);
        c.classList.toggle("dim", !on);
      });
      svg.querySelectorAll(".mx-head").forEach(function (h) {
        var r = h.getAttribute("data-row"), j = h.getAttribute("data-col");
        var hot = (r !== null && +r === rowSel) || (j !== null && +j === colSel);
        h.classList.toggle("hot", hot);
      });
    }

    function show(title, sub, items, link) {
      var html = "<h3>" + title + "</h3>";
      if (sub) html += "<p>" + sub + "</p>";
      if (items.length) {
        html += "<ul>";
        items.slice(0, 6).forEach(function (it) {
          html += "<li>" + it.t + " <span style=\"color:var(--faint)\">— " + it.v + "</span></li>";
        });
        html += "</ul>";
        if (items.length > 6) html += "<p class=\"hint\">and " + (items.length - 6) + " more.</p>";
      }
      if (link) html += "<a class=\"more\" href=\"" + link + "\">Publications in this domain →</a>";
      panel.innerHTML = html;
    }
    function reset() { panel.innerHTML = DEFAULT_HTML; paint(null, null); }

    /* Hovering alone made the panel unreadable: moving the pointer towards it crossed
       other cells and the contents changed underfoot. So hover only previews, and a
       click pins — while something is pinned, hover is ignored until you unpin. */
    var pinned = null;                       // "cell:i:j" | "row:i" | "col:j" | null

    function markPinned() {
      svg.classList.toggle("has-pin", !!pinned);
      svg.querySelectorAll(".mx-cell, .mx-head").forEach(function (el) {
        el.classList.remove("pinned");
      });
      if (!pinned) return;
      var a = pinned.split(":");
      if (a[0] === "cell") {
        var c = svg.querySelector('.mx-cell[data-row="' + a[1] + '"][data-col="' + a[2] + '"]');
        if (c) c.classList.add("pinned");
      } else if (a[0] === "row") {
        var r = svg.querySelector('.mx-head[data-row="' + a[1] + '"]');
        if (r) r.classList.add("pinned");
      } else {
        svg.querySelectorAll('.mx-head[data-col="' + a[1] + '"]').forEach(function (h) {
          h.classList.add("pinned");
        });
      }
    }
    function pinNote() {
      if (!panel.querySelector(".pin-note")) {
        panel.insertAdjacentHTML("beforeend",
          '<p class="pin-note">Pinned — click it again, or anywhere else on the grid, to release.</p>');
      }
    }

    /* the three views, each usable as a preview or as a pinned selection */
    function viewCell(c) {
      paint(c.i, c.j);
      show(METHODS[c.i] + " in " + DOMAINS[c.j],
           c.items.length + (c.items.length === 1 ? " output" : " outputs") + " at this intersection.",
           c.items, "publications.html?domain=" + DOMKEY[c.j]);
    }
    function viewRow(mi) {
      var its = ITEMS.filter(function (it) { return it.m.indexOf(mi) !== -1; });
      var doms = {};
      its.forEach(function (it) { it.d.forEach(function (d) { doms[d] = 1; }); });
      paint(mi, null);
      show(METHODS[mi], "Carried into " + Object.keys(doms).length + " of the five domains.", its, null);
    }
    function viewCol(di) {
      var its = ITEMS.filter(function (it) { return it.d.indexOf(di) !== -1; });
      paint(null, di);
      show(DOMAINS[di], its.length + (its.length === 1 ? " output" : " outputs") + " in this domain.", its,
           "publications.html?domain=" + DOMKEY[di]);
    }
    function render(key) {
      var a = key.split(":");
      if (a[0] === "cell") {
        var c = cells.filter(function (x) { return x.i === +a[1] && x.j === +a[2]; })[0];
        if (c) viewCell(c);
      } else if (a[0] === "row") { viewRow(+a[1]); }
      else { viewCol(+a[1]); }
    }

    function preview(key) { if (!pinned) render(key); }
    function pin(key) {
      pinned = (pinned === key) ? null : key;
      if (pinned) { render(pinned); pinNote(); } else { reset(); }
      markPinned();
    }

    cells.forEach(function (c) {
      if (!c.items.length) return;
      var key = "cell:" + c.i + ":" + c.j;
      c.g.addEventListener("mouseenter", function () { preview(key); });
      c.g.addEventListener("focus", function () { preview(key); });
      c.g.addEventListener("click", function (e) { e.stopPropagation(); pin(key); });
      c.g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); pin(key); }
      });
    });

    svg.querySelectorAll(".mx-head").forEach(function (h) {
      var r = h.getAttribute("data-row"), j = h.getAttribute("data-col");
      var key = r !== null ? "row:" + r : "col:" + j;
      h.setAttribute("tabindex", "0");
      h.setAttribute("role", "button");
      h.addEventListener("mouseenter", function () { preview(key); });
      h.addEventListener("focus", function () { preview(key); });
      h.addEventListener("click", function (e) { e.stopPropagation(); pin(key); });
      h.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); pin(key); }
      });
    });

    // clicking empty space in the grid releases the pin
    svg.addEventListener("click", function () { if (pinned) { pinned = null; reset(); markPinned(); } });
    svg.addEventListener("mouseleave", function () { if (!pinned) reset(); });
    svg.addEventListener("focusout", function (e) {
      if (!pinned && !svg.contains(e.relatedTarget)) reset();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && pinned) { pinned = null; reset(); markPinned(); }
    });
  }

  /* ===================== link topic cards to their figures ===================== */

  /* ===================== topic card -> figure, on click =====================
     Figures start closed. A thread card opens the one it belongs to, and so does
     the placeholder standing in for it, so the reader never has to hunt upwards
     for the card named in the placeholder text. ===================== */

  function linkTopicsToFigures() {
    var cards = [].slice.call(document.querySelectorAll("[data-fig]"));
    if (!cards.length) return;

    var byKey = {};
    cards.forEach(function (c) { byKey[c.getAttribute("data-fig")] = c; });

    function anyOpenIn(name) {
      var keys = name === "anim" ? ["tail", "detect", "gen"] : [name];
      return keys.some(function (k) {
        var f = document.getElementById("fig-" + k);
        return f && !f.hidden;
      });
    }
    function syncPlaceholders() {
      [].forEach.call(document.querySelectorAll(".fig-placeholder"), function (p) {
        p.hidden = anyOpenIn(p.getAttribute("data-for"));
      });
    }

    function close(card, fig) {
      fig.classList.remove("playing", "just-opened");
      fig.hidden = true;
      if (card) {
        card.classList.remove("linked");
        card.setAttribute("aria-expanded", "false");
      }
    }
    function open(card, fig) {
      fig.hidden = false;
      fig.classList.add("playing", "just-opened");
      if (card) {
        card.classList.add("linked");
        card.setAttribute("aria-expanded", "true");
      }
      window.requestAnimationFrame(function () {
        fig.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(function () { fig.classList.remove("just-opened"); }, 700);
      });
    }

    function openByKey(key) {
      var fig = document.getElementById("fig-" + key);
      if (!fig || !fig.hidden) return;
      open(byKey[key] || null, fig);
      syncPlaceholders();
    }

    cards.forEach(function (card) {
      var fig = document.getElementById("fig-" + card.getAttribute("data-fig"));
      if (!fig) return;

      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-expanded", "false");
      card.setAttribute("aria-controls", fig.id);

      function toggle(e) {
        if (e.target.closest && e.target.closest("a")) return;
        if (fig.hidden) { open(card, fig); } else { close(card, fig); }
        syncPlaceholders();
      }

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          toggle(e);
        }
      });
    });

    /* the placeholders act too: click one to open the figure it stands in for */
    [].forEach.call(document.querySelectorAll(".fig-placeholder"), function (ph) {
      var key = ph.getAttribute("data-open");
      var scrollTo = ph.getAttribute("data-scroll");
      if (!key && !scrollTo) return;

      if (key) {
        ph.setAttribute("role", "button");
        ph.setAttribute("tabindex", "0");
        ph.setAttribute("aria-controls", "fig-" + key);
      }

      function act(e) {
        // an inner button names its own figure
        var btn = e.target.closest && e.target.closest(".ph-link");
        if (btn) {
          e.stopPropagation();
          openByKey(btn.getAttribute("data-open"));
          return;
        }
        if (key) { openByKey(key); return; }
        if (scrollTo) {
          var target = document.getElementById(scrollTo);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("flash");
            window.setTimeout(function () { target.classList.remove("flash"); }, 1400);
          }
        }
      }

      ph.addEventListener("click", act);
      ph.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          act(e);
        }
      });
      [].forEach.call(ph.querySelectorAll(".ph-link"), function (b) {
        b.addEventListener("click", act);
      });
    });

    syncPlaceholders();
  }

  document.addEventListener("DOMContentLoaded", function () {
    outlierFigure();
    momentRatioFigure();
    methodMatrix();
    linkTopicsToFigures();
  });
})();
