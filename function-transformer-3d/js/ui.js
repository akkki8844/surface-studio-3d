/* ============================================================
   UI — wires every interactive element to state.
   Covers: sliders, toggles, segmented controls, function cards,
   preset cards, toolbar buttons, panel collapse, modal, theme,
   fullscreen, category tabs, search, color mode, resolution.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const UI = FT3D.ui = {};

  // ── Slider registry ─────────────────────────────────────────

  const SLIDERS = [
    { id: "rngA",     stateKey: "A",           valId: "valA",     toState: v => parseFloat(v), digits: 2 },
    { id: "rngB",     stateKey: "B",           valId: "valB",     toState: v => parseFloat(v), digits: 2 },
    { id: "rngCx",    stateKey: "Cx",          valId: "valCx",    toState: v => parseFloat(v), digits: 2 },
    { id: "rngCy",    stateKey: "Cy",          valId: "valCy",    toState: v => parseFloat(v), digits: 2 },
    { id: "rngD",     stateKey: "D",           valId: "valD",     toState: v => parseFloat(v), digits: 2 },
    { id: "rngTheta", stateKey: "theta",       valId: "valTheta", toState: v => parseFloat(v) * FT3D.constants.DEG2RAD, digits: 0, displayFn: v => Math.round(parseFloat(v)) + "°" },
    { id: "rngTwist", stateKey: "twist",       valId: "valTwist", toState: v => parseFloat(v), digits: 2 },
    { id: "rngRange", stateKey: "domainRange", valId: "valRange", toState: v => parseFloat(v), digits: 1 },
  ];

  function initSliders() {
    SLIDERS.forEach(({ id, stateKey, valId, toState, digits, displayFn }) => {
      const el  = FT3D.dom.byId(id);
      const vel = FT3D.dom.byId(valId);
      if (!el) return;

      // Set initial fill position
      FT3D.dom.setRangeFill(el);

      const onInput = function () {
        FT3D.dom.setRangeFill(el);
        const raw    = parseFloat(el.value);
        const stateV = toState(el.value);
        FT3D.state.set(stateKey, stateV);

        if (vel) {
          vel.textContent = displayFn
            ? displayFn(el.value)
            : FT3D.transforms.displayValue(stateKey, raw);
        }

        // Highlight active card
        const card = el.closest(".slider-card");
        if (card) {
          card.classList.add("active");
          clearTimeout(card._actT);
          card._actT = setTimeout(() => card.classList.remove("active"), 600);
        }
      };

      el.addEventListener("input", onInput);

      // Sync initial display value
      if (vel) {
        vel.textContent = displayFn
          ? displayFn(el.value)
          : FT3D.transforms.displayValue(stateKey, parseFloat(el.value));
      }
    });
  }

  // ── Toggles (reflection chips) ───────────────────────────────

  function initToggles() {
    [
      { id: "flipX", stateKey: "flipX" },
      { id: "flipY", stateKey: "flipY" },
      { id: "flipZ", stateKey: "flipZ" },
    ].forEach(({ id, stateKey }) => {
      const el = FT3D.dom.byId(id);
      if (!el) return;
      el.addEventListener("click", () => {
        const next = !FT3D.state.get(stateKey);
        FT3D.state.set(stateKey, next);
        el.setAttribute("aria-pressed", next ? "true" : "false");
        el.classList.toggle("active", next);
      });
    });
  }

  // ── Segmented controls ───────────────────────────────────────

  function initSegments() {
    // Color mode
    const colorGroup = FT3D.dom.byId("colorMode");
    if (colorGroup) {
      colorGroup.querySelectorAll(".seg").forEach(btn => {
        btn.addEventListener("click", () => {
          colorGroup.querySelectorAll(".seg").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          FT3D.state.set("colorMode", btn.dataset.mode);
          FT3D.status.show("Color: " + btn.textContent.trim());
        });
      });
    }

    // Resolution
    const resGroup = FT3D.dom.byId("resMode");
    if (resGroup) {
      resGroup.querySelectorAll(".seg").forEach(btn => {
        btn.addEventListener("click", () => {
          resGroup.querySelectorAll(".seg").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const n = parseInt(btn.dataset.res, 10);
          FT3D.state.set("resolution", n);
          FT3D.status.show("Resolution: " + n + "²", 1200);
        });
      });
    }
  }

  // ── Toolbar buttons ──────────────────────────────────────────

  function initToolbar() {
    const $ = FT3D.dom.byId.bind(FT3D.dom);

    // View presets
    [
      { id: "viewIso",   preset: "iso"   },
      { id: "viewTop",   preset: "top"   },
      { id: "viewFront", preset: "front" },
      { id: "viewSide",  preset: "side"  },
    ].forEach(({ id, preset }) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("click", () => {
        FT3D.bus.emit("camera:goTo", preset);
        setActiveToolBtn(el);
      });
    });

    // Auto-rotate toggle
    const autoBtn = $("autoRotate");
    if (autoBtn) {
      autoBtn.addEventListener("click", () => {
        const next = !FT3D.state.get("autoRotate");
        FT3D.state.set("autoRotate", next);
        autoBtn.classList.toggle("active", next);
        autoBtn.setAttribute("aria-pressed", next);
        FT3D.status.show(next ? "Auto-rotate ON" : "Auto-rotate OFF");
      });
    }

    // Wireframe toggle
    const wireBtn = $("wireToggle");
    if (wireBtn) {
      wireBtn.addEventListener("click", () => {
        const next = !FT3D.state.get("showWire");
        FT3D.state.set("showWire", next);
        wireBtn.classList.toggle("active", next);
        wireBtn.setAttribute("aria-pressed", next);
        FT3D.status.show(next ? "Wireframe ON" : "Wireframe OFF");
      });
    }

    // Grid/axes toggle
    const axesBtn = $("axesToggle");
    if (axesBtn) {
      // Start active (axes on by default)
      axesBtn.classList.add("active");
      axesBtn.addEventListener("click", () => {
        const next = !FT3D.state.get("showAxes");
        FT3D.state.set("showAxes", next);
        axesBtn.classList.toggle("active", next);
        axesBtn.setAttribute("aria-pressed", next);
        FT3D.status.show(next ? "Grid ON" : "Grid OFF");
      });
    }

    // Randomize
    const randBtn = $("randomize");
    if (randBtn) {
      randBtn.addEventListener("click", doRandomize);
    }

    // Reset
    const resetBtn = $("resetAll");
    if (resetBtn) {
      resetBtn.addEventListener("click", doReset);
    }
  }

  function setActiveToolBtn(el) {
    // Not exclusive — view buttons just flash
    el.style.background = "var(--accent-soft)";
    setTimeout(() => (el.style.background = ""), 300);
  }

  // ── Function card grid ───────────────────────────────────────

  function buildFnGrid(cat, query) {
    const grid = FT3D.dom.byId("fnGrid");
    if (!grid) return;

    const filtered = FT3D.filterFns(cat, query);
    const current  = FT3D.state.get("base");

    grid.innerHTML = "";

    filtered.forEach(fn => {
      // Build sparkline path
      const sparkPath = FT3D.fnSparkline(fn.id, 28, 18);

      const card = FT3D.dom.create("button", {
        class: "fn-card" + (fn.id === current ? " active" : ""),
        role: "option",
        "aria-selected": fn.id === current ? "true" : "false",
        "data-id": fn.id,
      },
        FT3D.dom.create("span", { class: "fn-card-label" }, fn.label),
        FT3D.dom.create("span", { class: "fn-card-desc"  }, fn.description),
        // Inline SVG sparkline
        (() => {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("class", "fn-card-spark");
          svg.setAttribute("viewBox", "0 0 28 18");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", sparkPath);
          svg.appendChild(path);
          return svg;
        })()
      );

      card.addEventListener("click", () => {
        FT3D.state.set("base", fn.id);
        // Update all cards
        grid.querySelectorAll(".fn-card").forEach(c => {
          const active = c.dataset.id === fn.id;
          c.classList.toggle("active", active);
          c.setAttribute("aria-selected", active ? "true" : "false");
        });
        FT3D.status.show(fn.label + " — " + fn.description, 2000);
      });

      grid.appendChild(card);
    });

    // Listen for external base changes (preset applied etc.) to sync cards
    FT3D.bus.on("state:base", (newBase) => {
      grid.querySelectorAll(".fn-card").forEach(c => {
        const active = c.dataset.id === newBase;
        c.classList.toggle("active", active);
        c.setAttribute("aria-selected", active ? "true" : "false");
      });
    });
  }

  function initFnLibrary() {
    let currentCat   = "all";
    let currentQuery = "";

    buildFnGrid(currentCat, "");

    // Category tabs
    const tabs = FT3D.dom.byId("categoryTabs");
    if (tabs) {
      tabs.querySelectorAll(".cat-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          tabs.querySelectorAll(".cat-tab").forEach(t => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
          });
          tab.classList.add("active");
          tab.setAttribute("aria-selected", "true");
          currentCat = tab.dataset.cat;
          buildFnGrid(currentCat, currentQuery);
        });
      });
    }

    // Search
    const search = FT3D.dom.byId("fnSearch");
    if (search) {
      search.addEventListener("input", FT3D.debounce(e => {
        currentQuery = e.target.value;
        buildFnGrid(currentCat, currentQuery);
      }, 180));
    }
  }

  // ── Preset cards ────────────────────────────────────────────

  function initPresets() {
    const grid = FT3D.dom.byId("presetGrid");
    if (!grid) return;

    FT3D.presets.forEach(preset => {
      const card = FT3D.dom.create("button", { class: "preset-card" },
        FT3D.dom.create("span", { class: "pn" }, preset.name),
        FT3D.dom.create("span", { class: "pd" }, preset.description)
      );
      card.addEventListener("click", () => {
        FT3D.applyPreset(preset);
        syncAllSlidersToState();
        syncTogglesToState();
      });
      grid.appendChild(card);
    });
  }

  // ── Panel collapse ───────────────────────────────────────────

  function initPanelCollapse() {
    const leftBtn  = FT3D.dom.byId("collapseLeft");
    const rightBtn = FT3D.dom.byId("collapseRight");

    if (leftBtn) {
      leftBtn.addEventListener("click", () => {
        document.body.classList.toggle("left-collapsed");
        // Trigger a resize so canvas fills new width
        setTimeout(() => FT3D.anim.onResize(), 320);
      });
    }
    if (rightBtn) {
      rightBtn.addEventListener("click", () => {
        document.body.classList.toggle("right-collapsed");
        setTimeout(() => FT3D.anim.onResize(), 320);
      });
    }
  }

  // ── Help modal ───────────────────────────────────────────────

  function initModal() {
    const modal     = FT3D.dom.byId("helpModal");
    const helpBtn   = FT3D.dom.byId("helpBtn");
    const closeHelp = FT3D.dom.byId("closeHelp");
    if (!modal) return;

    function open() {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      closeHelp && closeHelp.focus();
    }
    function close() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      helpBtn && helpBtn.focus();
    }

    helpBtn  && helpBtn.addEventListener("click", open);
    closeHelp && closeHelp.addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });

    FT3D.bus.on("ui:modal:open",  open);
    FT3D.bus.on("ui:modal:close", close);
    FT3D.ui.openHelp  = open;
    FT3D.ui.closeHelp = close;
  }

  // ── Theme toggle ────────────────────────────────────────────

  function initTheme() {
    const btn = FT3D.dom.byId("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = FT3D.state.get("theme") === "dark" ? "light" : "dark";
      FT3D.state.set("theme", next);
      document.documentElement.setAttribute("data-theme", next);
      FT3D.status.show("Theme: " + next);
    });
  }

  // ── Fullscreen ───────────────────────────────────────────────

  function initFullscreen() {
    const btn = FT3D.dom.byId("fullscreenBtn");
    if (!btn) return;
    btn.addEventListener("click", toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  FT3D.ui.toggleFullscreen = toggleFullscreen;

  // ── Global actions ───────────────────────────────────────────

  function doReset() {
    const defaults = {
      A: 1, B: 1, Cx: 0, Cy: 0, D: 0, theta: 0, twist: 0,
      flipX: false, flipY: false, flipZ: false,
    };
    FT3D.state.setMany(defaults);
    syncAllSlidersToState();
    syncTogglesToState();
    FT3D.status.show("Reset to defaults");
  }

  function doRandomize() {
    const patch = FT3D.randomTransform();
    FT3D.state.setMany(patch);
    syncAllSlidersToState();
    syncTogglesToState();
    FT3D.status.show("Randomized!");
  }

  FT3D.ui.reset      = doReset;
  FT3D.ui.randomize  = doRandomize;

  // ── Sync sliders ← state (used after preset / reset) ────────

  function syncAllSlidersToState() {
    const DEG2RAD = FT3D.constants.DEG2RAD;
    SLIDERS.forEach(({ id, stateKey, valId, digits, displayFn }) => {
      const el  = FT3D.dom.byId(id);
      const vel = FT3D.dom.byId(valId);
      if (!el) return;

      let raw = FT3D.state.get(stateKey);
      // theta is stored in radians; slider is in degrees
      if (stateKey === "theta") raw = raw / DEG2RAD;

      el.value = raw;
      FT3D.dom.setRangeFill(el);

      if (vel) {
        vel.textContent = displayFn
          ? displayFn(String(raw))
          : FT3D.transforms.displayValue(stateKey, raw);
      }
    });
  }

  function syncTogglesToState() {
    [
      { id: "flipX", stateKey: "flipX" },
      { id: "flipY", stateKey: "flipY" },
      { id: "flipZ", stateKey: "flipZ" },
    ].forEach(({ id, stateKey }) => {
      const el = FT3D.dom.byId(id);
      if (!el) return;
      const on = FT3D.state.get(stateKey);
      el.setAttribute("aria-pressed", on ? "true" : "false");
      el.classList.toggle("active", on);
    });
  }

  // ── Cycle helpers (used from keyboard.js) ───────────────────

  UI.cycleFn = function (dir) {
    const ids   = FT3D.fns.map(f => f.id);
    const cur   = FT3D.state.get("base");
    const idx   = ids.indexOf(cur);
    const next  = (idx + dir + ids.length) % ids.length;
    FT3D.state.set("base", ids[next]);
    FT3D.status.show(FT3D.fns[next].label);
  };

  UI.cycleColorMode = function () {
    const modes = ["gradient", "slope", "plasma", "viridis", "mono"];
    const cur   = FT3D.state.get("colorMode");
    const idx   = modes.indexOf(cur);
    const nextIdx = (idx + 1) % modes.length;
    FT3D.state.set("colorMode", modes[nextIdx]);

    // Sync segmented control
    const group = FT3D.dom.byId("colorMode");
    if (group) {
      group.querySelectorAll(".seg").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === modes[nextIdx]);
      });
    }
    FT3D.status.show("Color: " + modes[nextIdx]);
  };

  // ── Loading overlay ──────────────────────────────────────────

  UI.hideLoader = function () {
    const el = FT3D.dom.byId("loadingOverlay");
    if (el) {
      el.classList.add("hidden");
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }
  };

  // ── Main init ────────────────────────────────────────────────

  UI.init = function () {
    initSliders();
    initToggles();
    initSegments();
    initToolbar();
    initFnLibrary();
    initPresets();
    initPanelCollapse();
    initModal();
    initTheme();
    initFullscreen();
    FT3D.log.info("ui.js loaded and wired");
  };

})(window.FT3D);
