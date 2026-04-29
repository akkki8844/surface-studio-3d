/* ============================================================
   CAMERA — PerspectiveCamera + custom orbit controls.
   The surface lies in the XY plane with Z as height.
   We use Z-up spherical coordinates:
     theta  = azimuth (around Z)
     phi    = polar from Z axis (0 = top-down, π/2 = side)
   Converts to Three.js Y-up world by placing camera at
   a position that makes the surface visible and lit.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Camera = FT3D.camera = {};

  let _camera = null;
  let _canvas = null;

  // Current spherical state
  const sph = { r: 22, theta: 0.8, phi: 1.1 };   // phi ~63° from top — good view angle
  const tgt = { x: 0, y: 0, z: 0 };

  // Smooth destination
  const dst = { r: 22, theta: 0.8, phi: 1.1, tx: 0, ty: 0, tz: 0 };
  const vel = { theta: 0, phi: 0 };

  const DAMP     = 0.86;
  const CAM_DAMP = 0.12;

  let _drag   = null;
  let _touches = [];

  // Gizmo
  let _gizmoCanvas = null;
  let _gizmoCtx    = null;

  // ── Init ────────────────────────────────────────────────────

  Camera.init = function (canvas) {
    _canvas = canvas;
    const w = canvas.clientWidth  || 800;
    const h = canvas.clientHeight || 600;

    _camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
    Camera.updatePosition(true);

    // Gizmo
    _gizmoCanvas = FT3D.dom.byId("gizmoCanvas");
    if (_gizmoCanvas) {
      _gizmoCtx = _gizmoCanvas.getContext("2d");
      Camera.resizeGizmo();
    }

    // Mouse
    canvas.addEventListener("mousedown",   onMouseDown);
    canvas.addEventListener("mousemove",   onMouseMove);
    canvas.addEventListener("mouseup",     onMouseUp);
    canvas.addEventListener("mouseleave",  onMouseUp);
    canvas.addEventListener("wheel",       onWheel, { passive: false });
    canvas.addEventListener("dblclick",    onDblClick);
    canvas.addEventListener("contextmenu", e => e.preventDefault());

    // Touch
    canvas.addEventListener("touchstart",  onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",   onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd);

    FT3D.bus.on("camera:goTo", preset => Camera.goTo(preset));

    return _camera;
  };

  Camera.getCamera = function () { return _camera; };

  // ── Spherical → cartesian (Z-up) → Three.js Y-up ────────────
  // We store the surface in the XY plane (Z = height).
  // Camera position using Z-up spherical:
  //   x = r * sin(phi) * cos(theta)
  //   y = r * sin(phi) * sin(theta)
  //   z = r * cos(phi)
  // Then the camera looks at the target and uses (0,0,1) as up.
  // Three.js handles this correctly as long as we set camera.up.

  Camera.updatePosition = function (instant) {
    if (!_camera) return;

    if (instant) {
      sph.r = dst.r; sph.theta = dst.theta; sph.phi = dst.phi;
      tgt.x = dst.tx; tgt.y = dst.ty; tgt.z = dst.tz;
    } else {
      sph.r     = FT3D.math.lerp(sph.r,     dst.r,     CAM_DAMP);
      sph.theta = FT3D.math.lerp(sph.theta, dst.theta, CAM_DAMP);
      sph.phi   = FT3D.math.lerp(sph.phi,   dst.phi,   CAM_DAMP);
      tgt.x = FT3D.math.lerp(tgt.x, dst.tx, CAM_DAMP);
      tgt.y = FT3D.math.lerp(tgt.y, dst.ty, CAM_DAMP);
      tgt.z = FT3D.math.lerp(tgt.z, dst.tz, CAM_DAMP);
    }

    // Clamp phi so camera never flips past poles
    sph.phi = FT3D.math.clamp(sph.phi, 0.05, Math.PI - 0.05);

    const sinP = Math.sin(sph.phi);
    const cosP = Math.cos(sph.phi);
    const sinT = Math.sin(sph.theta);
    const cosT = Math.cos(sph.theta);

    _camera.position.set(
      tgt.x + sph.r * sinP * cosT,
      tgt.y + sph.r * sinP * sinT,
      tgt.z + sph.r * cosP
    );

    // Z-up: tell Three.js which direction is "up" so lookAt works correctly
    _camera.up.set(0, 0, 1);
    _camera.lookAt(tgt.x, tgt.y, tgt.z);
  };

  // ── Per-frame tick ───────────────────────────────────────────

  Camera.tick = function () {
    if (!_camera) return;

    if (FT3D.state.get("autoRotate") && !_drag) {
      dst.theta += 0.005;
    }

    if (!_drag) {
      if (Math.abs(vel.theta) > 0.00005) { dst.theta += vel.theta; vel.theta *= DAMP; }
      if (Math.abs(vel.phi)   > 0.00005) {
        dst.phi = FT3D.math.clamp(dst.phi + vel.phi, 0.06, Math.PI - 0.06);
        vel.phi *= DAMP;
      }
    }

    Camera.updatePosition(false);
    if (_gizmoCtx) Camera.drawGizmo();
  };

  // ── View presets ─────────────────────────────────────────────

  Camera.goTo = function (name) {
    const p = FT3D.viewPresets[name];
    if (!p) return;
    dst.r = p.radius; dst.theta = p.theta; dst.phi = p.phi;
    dst.tx = p.target[0]; dst.ty = p.target[1]; dst.tz = p.target[2];
    vel.theta = 0; vel.phi = 0;
    FT3D.state.set("cameraPreset", name);
    FT3D.status.show("View: " + p.name);
  };

  Camera.resetView = function () { Camera.goTo(FT3D.state.get("cameraPreset") || "iso"); };

  // ── Resize ───────────────────────────────────────────────────

  Camera.resize = function (w, h) {
    if (!_camera) return;
    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();
  };

  Camera.resizeGizmo = function () {
    if (!_gizmoCanvas) return;
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    const rect = _gizmoCanvas.parentElement.getBoundingClientRect();
    _gizmoCanvas.width  = Math.round((rect.width  || 96) * dpr);
    _gizmoCanvas.height = Math.round((rect.height || 96) * dpr);
    _gizmoCanvas.style.width  = (rect.width  || 96) + "px";
    _gizmoCanvas.style.height = (rect.height || 96) + "px";
  };

  // ── Mouse handlers ───────────────────────────────────────────

  function onMouseDown(e) {
    e.preventDefault();
    const isPan = e.button === 2 || e.ctrlKey;
    _drag = {
      type: isPan ? "pan" : "orbit",
      startX: e.clientX, startY: e.clientY,
      startTheta: dst.theta, startPhi: dst.phi,
      startTx: dst.tx, startTy: dst.ty,
      lastX: e.clientX, lastY: e.clientY,
    };
    vel.theta = 0; vel.phi = 0;
    _canvas.classList.add("grabbing");
  }

  function onMouseMove(e) {
    if (!_drag) return;
    const dx = e.clientX - _drag.startX;
    const dy = e.clientY - _drag.startY;
    const scale = (Math.PI * 1.8) / _canvas.clientWidth;

    if (_drag.type === "orbit") {
      dst.theta = _drag.startTheta - dx * scale;
      dst.phi   = FT3D.math.clamp(_drag.startPhi + dy * scale, 0.06, Math.PI - 0.06);
      vel.theta = (e.clientX - _drag.lastX) * (-scale);
      vel.phi   = (e.clientY - _drag.lastY) *   scale;
    } else {
      // Simple pan: shift target in XY
      const panK = sph.r * 0.0015;
      dst.tx = _drag.startTx - dx * panK * Math.cos(sph.theta);
      dst.ty = _drag.startTy - dx * panK * Math.sin(sph.theta);
    }
    _drag.lastX = e.clientX;
    _drag.lastY = e.clientY;
  }

  function onMouseUp()  { _drag = null; _canvas.classList.remove("grabbing"); }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.10 : 0.91;
    dst.r = FT3D.math.clamp(dst.r * factor, 3, 90);
  }

  function onDblClick() { Camera.resetView(); }

  // ── Touch handlers ───────────────────────────────────────────

  function onTouchStart(e) {
    e.preventDefault();
    _touches = Array.from(e.touches);
    if (_touches.length === 1) {
      _drag = {
        type: "orbit",
        startX: _touches[0].clientX, startY: _touches[0].clientY,
        startTheta: dst.theta, startPhi: dst.phi,
        startTx: dst.tx, startTy: dst.ty,
        lastX: _touches[0].clientX, lastY: _touches[0].clientY,
      };
      vel.theta = 0; vel.phi = 0;
    } else {
      _drag = null;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const cur = Array.from(e.touches);
    if (cur.length === 1 && _drag) {
      const dx = cur[0].clientX - _drag.startX;
      const dy = cur[0].clientY - _drag.startY;
      const scale = (Math.PI * 1.8) / (_canvas.clientWidth || 800) * 1.2;
      dst.theta = _drag.startTheta - dx * scale;
      dst.phi   = FT3D.math.clamp(_drag.startPhi + dy * scale, 0.06, Math.PI - 0.06);
      vel.theta = (cur[0].clientX - _drag.lastX) * (-scale);
      vel.phi   = (cur[0].clientY - _drag.lastY) *   scale;
      _drag.lastX = cur[0].clientX; _drag.lastY = cur[0].clientY;
    } else if (cur.length === 2 && _touches.length === 2) {
      const pd = Math.hypot(_touches[1].clientX - _touches[0].clientX, _touches[1].clientY - _touches[0].clientY);
      const cd = Math.hypot(cur[1].clientX - cur[0].clientX, cur[1].clientY - cur[0].clientY);
      if (pd > 1) dst.r = FT3D.math.clamp(dst.r * (pd / cd), 3, 90);
    }
    _touches = cur;
  }

  function onTouchEnd() { _drag = null; _touches = []; }

  // ── Gizmo renderer ───────────────────────────────────────────

  Camera.drawGizmo = function () {
    const ctx = _gizmoCtx;
    const W   = _gizmoCanvas.width;
    const H   = _gizmoCanvas.height;
    const dpr = W / (parseFloat(_gizmoCanvas.style.width) || 96);
    const cx  = W / 2, cy = H / 2;
    const R   = W * 0.34;

    ctx.clearRect(0, 0, W, H);

    const dark = FT3D.state.get("theme") !== "light";
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = dark ? "rgba(7,9,13,0.6)" : "rgba(240,245,252,0.7)";
    ctx.fill();

    // Project a world-space axis vector onto 2D gizmo screen
    // Camera forward in Z-up spherical:
    const phi   = sph.phi, theta = sph.theta;
    const sinP  = Math.sin(phi),  cosP  = Math.cos(phi);
    const sinT  = Math.sin(theta), cosT = Math.cos(theta);

    // forward = normalized (camera pos - target) direction inverted = (−sinP·cosT, −sinP·sinT, −cosP)
    const fwd = [-sinP * cosT, -sinP * sinT, -cosP];

    // Right = fwd × world_up (0,0,1), then normalize
    function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
    function norm(v) { const l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; }
    function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

    const right_ = norm(cross(fwd, [0,0,1]));
    const up_    = norm(cross(right_, fwd));

    function project2D(v) {
      return [cx + dot(v, right_) * R, cy - dot(v, up_) * R];
    }

    const axes = [
      { dir:[1,0,0], label:"X", color:"#ef4444" },
      { dir:[0,1,0], label:"Y", color:"#10b981" },
      { dir:[0,0,1], label:"Z", color:"#3b82f6" },
    ];
    axes.forEach(a => { a.depth = dot(a.dir, fwd); });
    axes.sort((a,b) => a.depth - b.depth);

    ctx.lineWidth = 2 * dpr;
    ctx.lineCap = "round";

    axes.forEach(({ dir, color }) => {
      const neg = dir.map(v => -v);
      const [x2, y2] = project2D(neg);
      ctx.beginPath();
      ctx.setLineDash([2*dpr, 2*dpr]);
      ctx.strokeStyle = color + "44";
      ctx.moveTo(cx, cy); ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    axes.forEach(({ dir, label, color }) => {
      const [x2, y2] = project2D(dir);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * dpr;
      ctx.moveTo(cx, cy); ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x2, y2, 4*dpr, 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.font = `700 ${Math.round(9*dpr)}px ui-monospace,Menlo,monospace`;
      ctx.fillStyle = dark ? "#ecf2f8" : "#0f172a";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const ox = (x2-cx)*0.28, oy = (y2-cy)*0.28;
      ctx.fillText(label, x2+ox, y2+oy);
    });
  };

  FT3D.log.info("camera.js loaded");
})(window.FT3D);
