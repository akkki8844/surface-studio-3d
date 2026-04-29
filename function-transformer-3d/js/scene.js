/* ============================================================
   SCENE — renderer, scene graph, background, minimal lighting.
   Surface is line-grid so no heavy lighting needed — just
   ambient for any helper meshes (axis cones etc.).
   ============================================================ */

(function (FT3D) {
  "use strict";

  if (!window.THREE) { FT3D.log.error("THREE missing"); return; }

  const Scene = FT3D.scene = {};

  let _renderer = null;
  let _scene    = null;

  Scene.init = function (canvas) {
    // ── Renderer ───────────────────────────────────────────────
    _renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const dark = FT3D.state.get("theme") !== "light";
    _renderer.setClearColor(dark ? 0x07090c : 0xf4f7fb, 1);

    // ── Scene ──────────────────────────────────────────────────
    _scene = new THREE.Scene();
    _scene.fog = new THREE.Fog(dark ? 0x07090c : 0xf4f7fb, 40, 95);

    // Ambient light for axis cones / origin sphere
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    _scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 5, 10);
    _scene.add(dirLight);

    // ── Surface (line grid) ────────────────────────────────────
    const surfGroup = FT3D.surface.build(FT3D.state.get("resolution") || 64);
    _scene.add(surfGroup);

    // ── Axes + ground grid ─────────────────────────────────────
    const R = FT3D.state.get("domainRange") || 5;
    const axesGroup = FT3D.axes.build(R + 1);
    axesGroup.visible = FT3D.state.get("showAxes") !== false;
    _scene.add(axesGroup);

    // ── Theme reactions ────────────────────────────────────────
    FT3D.bus.on("state:theme", (theme) => {
      const d = theme !== "light";
      const bg = d ? 0x07090c : 0xf4f7fb;
      _renderer.setClearColor(bg, 1);
      _scene.fog.color.setHex(bg);
    });

    FT3D.bus.on("state:showAxes", (on) => {
      const ag = FT3D.axes.getGroup();
      if (ag) ag.visible = !!on;
    });

    FT3D.bus.on("state:domainRange", (R) => {
      const old = FT3D.axes.getGroup();
      if (old && old.parent) old.parent.remove(old);
      const fresh = FT3D.axes.build(R + 1);
      fresh.visible = FT3D.state.get("showAxes") !== false;
      _scene.add(fresh);
    });

    Scene.resize(canvas.clientWidth || 800, canvas.clientHeight || 600);
    FT3D.log.info("scene.js: init complete");
    return _renderer;
  };

  Scene.getRenderer = function () { return _renderer; };
  Scene.getScene    = function () { return _scene; };
  Scene.resize = function (w, h) {
    if (_renderer) _renderer.setSize(w, h, false);
  };

  FT3D.log.info("scene.js loaded");
})(window.FT3D);
