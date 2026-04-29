/* ============================================================
   FUNCTIONS — library of 3D surface functions z = f(x, y)
   Each entry includes: id, label, formula (pretty), description,
   category, fn(x,y) → z, and optional zClamp for stability.
   ============================================================ */

(function (FT3D) {
  "use strict";

  /**
   * Categories used by the UI:
   *   trig   — sinusoidal / oscillatory
   *   poly   — polynomial / saddle / paraboloid
   *   radial — depends on √(x²+y²)
   *   exotic — special / decorative
   */
  const FNS = [
    {
      id: "rippleSin",
      label: "Ripple",
      formula: "sin(√(x² + y²))",
      formulaPretty: "sin(r)",
      description: "Concentric ripples emanating from origin.",
      category: "radial",
      zClamp: 1.4,
      fn: function (x, y) { return Math.sin(Math.sqrt(x * x + y * y)); },
    },
    {
      id: "eggCrate",
      label: "Egg Crate",
      formula: "sin(x) · cos(y)",
      formulaPretty: "sin(x)·cos(y)",
      description: "Tessellating sinusoidal crests and troughs.",
      category: "trig",
      zClamp: 1.4,
      fn: function (x, y) { return Math.sin(x) * Math.cos(y); },
    },
    {
      id: "saddle",
      label: "Saddle",
      formula: "x² − y²",
      formulaPretty: "x² − y²",
      description: "Hyperbolic paraboloid — minimum and maximum at origin.",
      category: "poly",
      zClamp: 30,
      fn: function (x, y) { return (x * x - y * y) * 0.4; },
    },
    {
      id: "paraboloid",
      label: "Bowl",
      formula: "x² + y²",
      formulaPretty: "x² + y²",
      description: "Circular paraboloid — a perfect bowl.",
      category: "poly",
      zClamp: 30,
      fn: function (x, y) { return (x * x + y * y) * 0.3; },
    },
    {
      id: "monkeySaddle",
      label: "Monkey Saddle",
      formula: "x³ − 3xy²",
      formulaPretty: "x³ − 3xy²",
      description: "Cubic surface with three downward and three upward folds.",
      category: "poly",
      zClamp: 30,
      fn: function (x, y) { return (x * x * x - 3 * x * y * y) * 0.08; },
    },
    {
      id: "twistedSin",
      label: "Twisted Sin",
      formula: "sin(x + y)",
      formulaPretty: "sin(x + y)",
      description: "Diagonal sinusoidal sheet.",
      category: "trig",
      zClamp: 1.2,
      fn: function (x, y) { return Math.sin(x + y); },
    },
    {
      id: "cosineWaves",
      label: "Cosine Pair",
      formula: "cos(x) + cos(y)",
      formulaPretty: "cos x + cos y",
      description: "Sum of orthogonal cosine waves.",
      category: "trig",
      zClamp: 2.2,
      fn: function (x, y) { return Math.cos(x) + Math.cos(y); },
    },
    {
      id: "gaussian",
      label: "Gaussian Bell",
      formula: "e^(−(x² + y²)/2)",
      formulaPretty: "e^(−r²/2)",
      description: "Bell curve — symmetric peak at origin.",
      category: "radial",
      zClamp: 1.05,
      fn: function (x, y) { return Math.exp(-(x * x + y * y) * 0.5); },
    },
    {
      id: "mexicanHat",
      label: "Mexican Hat",
      formula: "(1 − r²/2) · e^(−r²/4)",
      formulaPretty: "(1−r²/2)·e^(−r²/4)",
      description: "Ricker wavelet — central peak with surrounding trough.",
      category: "radial",
      zClamp: 1.5,
      fn: function (x, y) {
        const r2 = x * x + y * y;
        return (1 - r2 * 0.5) * Math.exp(-r2 * 0.25);
      },
    },
    {
      id: "cosR2",
      label: "Interference",
      formula: "cos(x² + y²) / (1 + r²/8)",
      formulaPretty: "cos(r²) / (1+r²/8)",
      description: "High-frequency interference fringes that taper out.",
      category: "radial",
      zClamp: 1.2,
      fn: function (x, y) {
        const r2 = x * x + y * y;
        return Math.cos(r2) / (1 + r2 * 0.125);
      },
    },
    {
      id: "pyramid",
      label: "Pyramid",
      formula: "−max(|x|, |y|)",
      formulaPretty: "−max(|x|,|y|)",
      description: "Inverted square pyramid.",
      category: "exotic",
      zClamp: 12,
      fn: function (x, y) { return -Math.max(Math.abs(x), Math.abs(y)); },
    },
    {
      id: "cone",
      label: "Cone",
      formula: "−√(x² + y²)",
      formulaPretty: "−r",
      description: "Inverted cone with apex at origin.",
      category: "radial",
      zClamp: 12,
      fn: function (x, y) { return -Math.sqrt(x * x + y * y); },
    },
    {
      id: "hyperbolic",
      label: "Hyperbolic",
      formula: "x · y",
      formulaPretty: "xy",
      description: "Hyperbolic paraboloid — twisted plane.",
      category: "poly",
      zClamp: 30,
      fn: function (x, y) { return x * y * 0.3; },
    },
    {
      id: "lens",
      label: "Lens",
      formula: "1 / (1 + x² + y²)",
      formulaPretty: "1 / (1 + r²)",
      description: "Lorentzian — soft central peak with flat skirts.",
      category: "radial",
      zClamp: 1.05,
      fn: function (x, y) { return 1 / (1 + x * x + y * y); },
    },
    {
      id: "spiral",
      label: "Spiral",
      formula: "sin(r + θ·3)",
      formulaPretty: "sin(r + 3θ)",
      description: "Three-arm spiral wave.",
      category: "exotic",
      zClamp: 1.3,
      fn: function (x, y) {
        const r = Math.sqrt(x * x + y * y);
        const ang = Math.atan2(y, x);
        return Math.sin(r + 3 * ang);
      },
    },
    {
      id: "checker",
      label: "Soft Checker",
      formula: "tanh(sin(x)·sin(y)·4)",
      formulaPretty: "tanh(sin x · sin y · 4)",
      description: "Soft-edged tile pattern.",
      category: "exotic",
      zClamp: 1.05,
      fn: function (x, y) { return Math.tanh(Math.sin(x) * Math.sin(y) * 4); },
    },
    {
      id: "dunes",
      label: "Dunes",
      formula: "sin(x) · 0.6 + sin(0.7y + 0.3x) · 0.4",
      formulaPretty: "sin x + ½ sin(0.7y+0.3x)",
      description: "Sand-like rolling dunes.",
      category: "exotic",
      zClamp: 1.5,
      fn: function (x, y) {
        return Math.sin(x) * 0.6 + Math.sin(0.7 * y + 0.3 * x) * 0.4;
      },
    },
    {
      id: "torusSheet",
      label: "Torus Sheet",
      formula: "sin(2r) · cos(3θ)",
      formulaPretty: "sin(2r)·cos(3θ)",
      description: "Petal-banded angular surface.",
      category: "exotic",
      zClamp: 1.2,
      fn: function (x, y) {
        const r = Math.sqrt(x * x + y * y);
        const ang = Math.atan2(y, x);
        return Math.sin(2 * r) * Math.cos(3 * ang);
      },
    },
  ];

  // Build index by id
  const FN_INDEX = Object.create(null);
  FNS.forEach(f => { FN_INDEX[f.id] = f; });

  /** All function entries */
  FT3D.fns = FNS;

  /** Lookup by id, with safe fallback */
  FT3D.getFn = function (id) {
    return FN_INDEX[id] || FNS[0];
  };

  /** Filter helpers */
  FT3D.filterFns = function (cat, query) {
    let arr = FNS;
    if (cat && cat !== "all") arr = arr.filter(f => f.category === cat);
    if (query) {
      const q = query.toLowerCase().trim();
      arr = arr.filter(f =>
        f.label.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return arr;
  };

  /** Build a small SVG sparkline path representing a 1D slice y=0 of the function */
  FT3D.fnSparkline = function (id, w, h) {
    const fn = FT3D.getFn(id);
    if (!fn) return "";
    const samples = 28;
    const xMin = -5, xMax = 5;
    const points = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const x = FT3D.math.lerp(xMin, xMax, i / samples);
      let y = fn.fn(x, 0);
      if (!isFinite(y)) y = 0;
      // Clamp obscene values for sparkline visibility
      if (fn.zClamp != null) {
        y = FT3D.math.clamp(y, -fn.zClamp, fn.zClamp);
      }
      points.push([x, y]);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad; yMax += pad;
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      const px = FT3D.math.mapRange(x, xMin, xMax, 1, w - 1);
      const py = FT3D.math.mapRange(y, yMin, yMax, h - 1, 1);
      d += (i === 0 ? "M" : "L") + px.toFixed(1) + "," + py.toFixed(1);
    }
    return d;
  };

  FT3D.log.info("functions.js loaded:", FNS.length, "surfaces");
})(window.FT3D);
