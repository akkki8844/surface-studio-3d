/* ============================================================
   ANIMATION — main requestAnimationFrame loop.
   Responsibilities:
     • Drive the render loop (renderer.render)
     • Tick camera (inertia, auto-rotate, gizmo)
     • Update shader time uniforms for subtle pulsing
     • FPS counter (rolling 60-frame average)
     • Vert count HUD
     • Surface morph animation (smooth blend when base fn changes)
     • Resize observer
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Anim = FT3D.anim = {};

  let _rafId     = null;
  let _running   = false;
  let _renderer  = null;
  let _scene     = null;
  let _camera    = null;

  // Timing
  let _lastTime  = 0;
  let _elapsed   = 0;

  // FPS rolling buffer (60 samples)
  const FPS_SAMPLES = 60;
  const _fpsBuf  = new Float32Array(FPS_SAMPLES);
  let   _fpsIdx  = 0;
  let   _fpsEl   = null;
  let   _resEl   = null;
  let   _vertsEl = null;
  let   _fpsNext = 0;   // timestamp of next HUD update

  // Morph state
  const morph = {
    active: false,
    t: 0,
    duration: 400,  // ms
    startTime: 0,
    prevBase: null,
  };

  // ── Init ────────────────────────────────────────────────────

  Anim.init = function (renderer, scene, camera) {
    _renderer = renderer;
    _scene    = scene;
    _camera   = camera;

    _fpsEl   = FT3D.dom.byId("fpsValue");
    _resEl   = FT3D.dom.byId("resValue");
    _vertsEl = FT3D.dom.byId("vertsValue");

    // Resize observer on canvas wrapper
    const stage = FT3D.dom.byId("stage");
    if (stage && window.ResizeObserver) {
      const ro = new ResizeObserver(FT3D.debounce(() => Anim.onResize(), 80));
      ro.observe(stage);
    } else {
      FT3D.dom.on(window, "resize", FT3D.debounce(() => Anim.onResize(), 100));
    }

    // Base function change → trigger morph
    FT3D.bus.on("state:base", (newBase, state) => {
      morph.prevBase = null; // could store prev snapshot for tweening verts
      morph.active   = false;
      // geometry.js already handles the update via bus; just ensure HUD refreshes
      Anim.updateHUD();
    });

    FT3D.bus.on("state:resolution", () => {
      Anim.updateHUD();
      if (_resEl) _resEl.textContent = FT3D.state.get("resolution") + "²";
    });

    FT3D.bus.on("surface:updated", () => Anim.updateHUD());
  };

  // ── Start / Stop ────────────────────────────────────────────

  Anim.start = function () {
    if (_running) return;
    _running = true;
    _lastTime = performance.now();
    _rafId = requestAnimationFrame(loop);
    FT3D.log.info("Render loop started");
  };

  Anim.stop = function () {
    _running = false;
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = null;
  };

  // ── Main loop ────────────────────────────────────────────────

  function loop(now) {
    if (!_running) return;
    _rafId = requestAnimationFrame(loop);

    const dt = Math.min(now - _lastTime, 100); // clamp to 100ms max (tab-blur recovery)
    _lastTime = now;
    _elapsed += dt;

    // FPS tracking
    trackFPS(dt);

    // Camera tick (inertia, auto-rotate, gizmo)
    FT3D.camera.tick(dt);

    // Update shader time uniforms
    const mat = FT3D.surface.getMaterial();
    if (mat && mat.uniforms && mat.uniforms.uTime) {
      mat.uniforms.uTime.value = _elapsed * 0.001;
    }

    // Render
    if (_renderer && _scene && _camera) {
      _renderer.render(_scene, FT3D.camera.getCamera());
    }

    // HUD (throttled to 10 Hz)
    if (now > _fpsNext) {
      _fpsNext = now + 100;
      updateFpsDisplay();
      Anim.updateHUD();
    }
  }

  // ── FPS ─────────────────────────────────────────────────────

  function trackFPS(dt) {
    _fpsBuf[_fpsIdx % FPS_SAMPLES] = dt;
    _fpsIdx++;
  }

  function updateFpsDisplay() {
    if (!_fpsEl) return;
    const n   = Math.min(_fpsIdx, FPS_SAMPLES);
    let   sum = 0;
    for (let i = 0; i < n; i++) sum += _fpsBuf[i];
    const avgMs = sum / n;
    const fps   = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
    _fpsEl.textContent = fps;
    _fpsEl.className   = fps >= 55 ? "good" : fps >= 30 ? "warn" : "bad";
  }

  // ── HUD helpers ─────────────────────────────────────────────

  Anim.updateHUD = function () {
    if (_resEl)   _resEl.textContent   = FT3D.state.get("resolution") + "²";
    if (_vertsEl) {
      const n = FT3D.state.get("resolution");
      _vertsEl.textContent = formatK(n * n * 2 * 3);
    }
  };

  function formatK(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(0) + "K";
    return String(n);
  }

  // ── Resize ──────────────────────────────────────────────────

  Anim.onResize = function () {
    const stage  = FT3D.dom.byId("stage");
    if (!stage || !_renderer) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    _renderer.setSize(w, h, false);
    FT3D.camera.resize(w, h);
    FT3D.camera.resizeGizmo();
  };

  FT3D.log.info("animation.js loaded");
})(window.FT3D);
