/* ============================================================
   CORE — namespace, math helpers, DOM helpers, state, events
   ============================================================ */

(function (root) {
  "use strict";

  /** Global namespace for the app. Every module attaches to this. */
  const FT3D = root.FT3D = root.FT3D || {};

  // ---------- Constants ----------

  FT3D.constants = {
    TWO_PI: Math.PI * 2,
    HALF_PI: Math.PI / 2,
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    EPS: 1e-9,
    STORAGE_KEY: "ft3d.state.v1",
  };

  // ---------- Math helpers ----------

  const M = FT3D.math = {};

  M.clamp = function (v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  };

  M.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  M.invLerp = function (a, b, v) {
    if (Math.abs(b - a) < FT3D.constants.EPS) return 0;
    return (v - a) / (b - a);
  };

  M.mapRange = function (v, inA, inB, outA, outB) {
    return M.lerp(outA, outB, M.invLerp(inA, inB, v));
  };

  M.smoothstep = function (a, b, t) {
    t = M.clamp(M.invLerp(a, b, t), 0, 1);
    return t * t * (3 - 2 * t);
  };

  M.smootherstep = function (a, b, t) {
    t = M.clamp(M.invLerp(a, b, t), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  M.deg2rad = function (d) { return d * FT3D.constants.DEG2RAD; };
  M.rad2deg = function (r) { return r * FT3D.constants.RAD2DEG; };

  M.round = function (v, step) {
    return Math.round(v / step) * step;
  };

  M.fmt = function (v, digits) {
    if (digits == null) digits = 2;
    if (Math.abs(v) < FT3D.constants.EPS) return (0).toFixed(digits);
    return v.toFixed(digits);
  };

  M.fmtSigned = function (v, digits) {
    const s = M.fmt(Math.abs(v), digits);
    return (v < 0 ? "−" : "") + s;
  };

  /** Easing functions */
  M.ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    outBack: t => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: t => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
  };

  /** Random helpers */
  M.random = {
    range: (lo, hi) => lo + Math.random() * (hi - lo),
    int: (lo, hi) => Math.floor(M.random.range(lo, hi + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    sign: () => Math.random() < 0.5 ? -1 : 1,
    snap: (lo, hi, step) => {
      const v = M.random.range(lo, hi);
      return M.round(v, step);
    },
  };

  // ---------- DOM helpers ----------

  const D = FT3D.dom = {};

  D.$  = (sel, parent) => (parent || document).querySelector(sel);
  D.$$ = (sel, parent) => Array.from((parent || document).querySelectorAll(sel));
  D.byId = (id) => document.getElementById(id);

  D.on = function (el, ev, fn, opts) {
    if (!el) return () => {};
    el.addEventListener(ev, fn, opts);
    return () => el.removeEventListener(ev, fn, opts);
  };

  D.create = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class" || k === "className") el.className = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") Object.assign(el.style, attrs[k]);
        else if (k === "dataset" && typeof attrs[k] === "object") {
          for (const dk in attrs[k]) el.dataset[dk] = attrs[k][dk];
        }
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        }
        else if (attrs[k] === false || attrs[k] == null) { /* skip */ }
        else el.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
      }
    }
    for (const child of children) {
      if (child == null) continue;
      if (Array.isArray(child)) child.forEach(c => el.appendChild(c instanceof Node ? c : document.createTextNode(String(c))));
      else el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  };

  D.cssVar = function (name, parent) {
    const root = parent || document.documentElement;
    return getComputedStyle(root).getPropertyValue(name).trim();
  };

  D.setRangeFill = function (input) {
    if (!input || input.type !== "range") return;
    const min = parseFloat(input.min || "0");
    const max = parseFloat(input.max || "100");
    const v = parseFloat(input.value);
    const pct = M.invLerp(min, max, v) * 100;
    input.style.setProperty("--rng-pct", pct + "%");
  };

  // ---------- Event emitter ----------

  FT3D.EventEmitter = class EventEmitter {
    constructor() { this._h = Object.create(null); }
    on(ev, fn) {
      (this._h[ev] = this._h[ev] || []).push(fn);
      return () => this.off(ev, fn);
    }
    off(ev, fn) {
      const arr = this._h[ev];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
    emit(ev, ...args) {
      const arr = this._h[ev];
      if (!arr) return;
      for (let i = 0, n = arr.length; i < n; i++) {
        try { arr[i](...args); } catch (e) { console.error("listener", ev, e); }
      }
    }
  };

  /** App-wide event bus */
  FT3D.bus = new FT3D.EventEmitter();

  // ---------- Storage ----------

  FT3D.storage = {
    save(state) {
      try {
        localStorage.setItem(FT3D.constants.STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (e) { return false; }
    },
    load() {
      try {
        const raw = localStorage.getItem(FT3D.constants.STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    clear() {
      try { localStorage.removeItem(FT3D.constants.STORAGE_KEY); } catch (e) {}
    },
  };

  // ---------- App state ----------

  /**
   * Centralized mutable application state.
   * Subscribe to changes via FT3D.bus.on('state:change', (key, value, state) => …)
   */
  const _state = {
    // Function selection
    base: "rippleSin",          // current surface fn id

    // Transformation params
    A: 1,        // vertical stretch
    B: 1,        // horizontal compress (frequency)
    Cx: 0,       // x shift
    Cy: 0,       // y shift
    D: 0,        // vertical shift
    theta: 0,    // rotation around z (radians)
    twist: 0,    // radial twist factor

    flipX: false,
    flipY: false,
    flipZ: false,

    // Visual
    colorMode: "gradient",
    resolution: 64,
    domainRange: 5,           // ± domain
    showWire: false,
    showAxes: true,
    autoRotate: false,

    // Theme
    theme: "dark",

    // Camera
    cameraPreset: "iso",
  };

  FT3D.state = {
    get: function (key) { return key == null ? _state : _state[key]; },
    set: function (key, value) {
      if (_state[key] === value) return;
      _state[key] = value;
      FT3D.bus.emit("state:change", key, value, _state);
      FT3D.bus.emit("state:" + key, value, _state);
    },
    setMany: function (patch) {
      const changed = [];
      for (const k in patch) {
        if (_state[k] !== patch[k]) {
          _state[k] = patch[k];
          changed.push(k);
        }
      }
      for (const k of changed) {
        FT3D.bus.emit("state:change", k, _state[k], _state);
        FT3D.bus.emit("state:" + k, _state[k], _state);
      }
    },
    snapshot: function () { return JSON.parse(JSON.stringify(_state)); },
    restore: function (snap) {
      if (!snap) return;
      this.setMany(snap);
    },
  };

  // ---------- Status readout helper ----------

  FT3D.status = {
    _t: null,
    show(msg, ms) {
      const el = D.byId("statusReadout");
      if (!el) return;
      el.textContent = msg;
      el.classList.add("active");
      clearTimeout(this._t);
      if (ms !== 0) {
        this._t = setTimeout(() => {
          el.classList.remove("active");
          el.textContent = "Ready";
        }, ms || 1800);
      }
    },
    set(msg) {
      const el = D.byId("statusReadout");
      if (el) el.textContent = msg;
    },
  };

  // ---------- RAF throttle ----------

  FT3D.rafThrottle = function (fn) {
    let q = false;
    let lastArgs = null;
    return function (...args) {
      lastArgs = args;
      if (q) return;
      q = true;
      requestAnimationFrame(() => {
        q = false;
        fn.apply(null, lastArgs);
      });
    };
  };

  // ---------- Debounce ----------

  FT3D.debounce = function (fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  };

  // ---------- Color helpers ----------

  FT3D.color = {
    /** Linear interpolation between two hex colors */
    lerpHex(a, b, t) {
      const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
      const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
      const r = Math.round(M.lerp(ar, br, t));
      const g = Math.round(M.lerp(ag, bg, t));
      const v = Math.round(M.lerp(ab, bb, t));
      return "#" + [r, g, v].map(n => n.toString(16).padStart(2, "0")).join("");
    },

    /** Sample a discrete color stop array at parameter t∈[0,1] with linear interpolation */
    sampleRamp(stops, t) {
      t = M.clamp(t, 0, 1);
      const n = stops.length - 1;
      const i = Math.min(Math.floor(t * n), n - 1);
      const local = t * n - i;
      return this.lerpHex(stops[i], stops[i + 1], local);
    },

    hexToVec3(hex) {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b];
    },
  };

  // ---------- Logger (silenced in production toggle) ----------

  FT3D.log = {
    enabled: true,
    info(...a)  { if (this.enabled) console.info("[FT3D]", ...a); },
    warn(...a)  { if (this.enabled) console.warn("[FT3D]", ...a); },
    error(...a) { console.error("[FT3D]", ...a); },
  };

  FT3D.log.info("core.js loaded");
})(window);
