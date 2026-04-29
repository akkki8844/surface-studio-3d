/* ============================================================
   MATERIALS — line-grid surface uses LineBasicMaterial with
   vertexColors.  Color ramp helpers live here.
   ============================================================ */

(function (FT3D) {
  "use strict";

  if (!window.THREE) { FT3D.log.error("THREE missing"); return; }

  // ── Color ramps ──────────────────────────────────────────────
  // Each entry = array of CSS hex stops sampled at t ∈ [0,1].

  const RAMPS = {
    gradient: ["#1e3a8a","#1d4ed8","#06b6d4","#2dd4bf","#a3e635","#fde047","#f97316"],
    slope:    ["#0f172a","#1e3a8a","#0e7490","#10b981","#fbbf24","#ef4444","#7f1d1d"],
    plasma:   ["#0d0221","#6600b3","#cc00a0","#ff5050","#ffa500","#ffff00","#e8e8ff"],
    viridis:  ["#440154","#3b528b","#21918c","#5ec962","#fde725","#fde725","#ffffff"],
    mono:     ["#1e293b","#334155","#475569","#64748b","#94a3b8","#cbd5e1","#f1f5f9"],
  };

  const Materials = FT3D.materials = {};
  Materials.RAMPS = RAMPS;

  // Reusable color object (avoids GC churn in the hot update loop)
  const _tmpColor = new THREE.Color();

  /** Height t ∈ [0,1] → THREE.Color via active ramp */
  Materials.heightToColor = function (t) {
    const mode  = FT3D.state.get("colorMode") || "gradient";
    const stops = RAMPS[mode] || RAMPS.gradient;
    t = Math.max(0, Math.min(1, t));
    const seg = (stops.length - 1) * t;
    const lo  = Math.floor(seg);
    const hi  = Math.min(lo + 1, stops.length - 1);
    const f   = seg - lo;
    const ca  = new THREE.Color(stops[lo]);
    const cb  = new THREE.Color(stops[hi]);
    _tmpColor.setRGB(
      ca.r + (cb.r - ca.r) * f,
      ca.g + (cb.g - ca.g) * f,
      ca.b + (cb.b - ca.b) * f
    );
    return _tmpColor;
  };

  /** Called by geometry.js — returns a fresh LineBasicMaterial */
  Materials.createSurface = function () {
    return new THREE.LineBasicMaterial({ vertexColors: true });
  };

  /** Wireframe — not used for line-grid but kept for API compat */
  Materials.createWireframe = function () {
    return new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.05,
    });
  };

  /** Grid floor lines */
  Materials.createGridMaterial = function () {
    const dark = FT3D.state.get("theme") !== "light";
    return new THREE.LineBasicMaterial({
      color: dark ? 0x1e293b : 0xbfcad5,
      transparent: true, opacity: 0.5,
    });
  };

  /** Axis arrowhead cones */
  Materials.createAxisHeadMaterial = function (hex) {
    return new THREE.MeshBasicMaterial({ color: hex });
  };

  /** Unused; kept so scene.js call doesn't throw */
  Materials.createBackdrop = function () { return null; };

  // Theme changes propagate via surface.update (colors are recomputed)
  FT3D.bus.on("state:theme", () => {
    FT3D.surface && FT3D.rafThrottle(FT3D.surface.update)();
  });

  FT3D.log.info("materials.js loaded");
})(window.FT3D);
