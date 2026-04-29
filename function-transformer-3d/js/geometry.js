/* ============================================================
   GEOMETRY — line-grid surface.
   Renders as TWO sets of LineSegments:
     • X-parallel lines  (one polyline per row j = 0..N)
     • Y-parallel lines  (one polyline per col i = 0..N)
   Each segment pair gets a vertex-color from the height ramp.
   No filled triangles — just the classic math surface line plot.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Surface = FT3D.surface = {};

  // Line resolution (separate from the old mesh resolution).
  // 48 means 48×48 grid → 48+1 = 49 lines each way, 48 segs per line.
  let _N  = 64;
  let _R  = 5;

  // Three.js objects
  let _group    = null;   // THREE.Group containing both line sets
  let _linesX   = null;   // LineSegments — X-direction
  let _linesY   = null;   // LineSegments — Y-direction
  let _geoX     = null;
  let _geoY     = null;
  let _mat      = null;   // shared LineBasicMaterial (vertexColors)

  // ── Build ────────────────────────────────────────────────────
  // Called once at startup or when resolution/domainRange changes.

  Surface.build = function (resolution) {
    _N = resolution || _N;
    _R = FT3D.state.get("domainRange") || 5;

    // Dispose old geometry
    if (_geoX) { _geoX.dispose(); _geoX = null; }
    if (_geoY) { _geoY.dispose(); _geoY = null; }

    // Shared material
    if (!_mat) {
      _mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: false,
        linewidth: 1,     // >1 only works in some browsers; 1 is always safe
      });
    }

    // Vertex counts:
    //   X-lines: (N+1) rows × N segments × 2 verts = (N+1)*N*2
    //   Y-lines: (N+1) cols × N segments × 2 verts = (N+1)*N*2
    const segsPerLine = _N;
    const lineCount   = _N + 1;
    const vertsPerSet = lineCount * segsPerLine * 2;

    const posX = new Float32Array(vertsPerSet * 3);
    const colX = new Float32Array(vertsPerSet * 3);
    const posY = new Float32Array(vertsPerSet * 3);
    const colY = new Float32Array(vertsPerSet * 3);

    _geoX = new THREE.BufferGeometry();
    _geoX.setAttribute("position", new THREE.BufferAttribute(posX, 3));
    _geoX.setAttribute("color",    new THREE.BufferAttribute(colX, 3));

    _geoY = new THREE.BufferGeometry();
    _geoY.setAttribute("position", new THREE.BufferAttribute(posY, 3));
    _geoY.setAttribute("color",    new THREE.BufferAttribute(colY, 3));

    if (!_group) {
      _group = new THREE.Group();
      _group.name = "FT3D_Surface";
      _group.frustumCulled = false;
    }

    // Remove old line meshes
    while (_group.children.length) _group.remove(_group.children[0]);

    _linesX = new THREE.LineSegments(_geoX, _mat);
    _linesX.frustumCulled = false;
    _linesY = new THREE.LineSegments(_geoY, _mat);
    _linesY.frustumCulled = false;

    _group.add(_linesX);
    _group.add(_linesY);

    Surface.update();
    return _group;
  };

  // ── Update (hot path — runs on every slider change) ──────────

  Surface.update = function () {
    if (!_geoX || !_geoY) return;

    const st = FT3D.state.get();
    _R       = st.domainRange || 5;
    const N  = _N;

    const fn     = FT3D.getFn(st.base).fn;
    const zClamp = FT3D.getFn(st.base).zClamp || 50;

    // Unpack transform params into locals
    const A      = st.A;
    const B      = Math.max(0.05, st.B);
    const Cx     = st.Cx;
    const Cy     = st.Cy;
    const D      = st.D;
    const cosT   = Math.cos(st.theta);
    const sinT   = Math.sin(st.theta);
    const twist  = st.twist;
    const sx     = st.flipY ? -1 : 1;
    const sy     = st.flipX ? -1 : 1;
    const szSign = st.flipZ ? -1 : 1;
    const step   = (2 * _R) / N;

    // ── Pass 1: compute the (N+1)×(N+1) height grid ──────────
    const grid = new Float32Array((N + 1) * (N + 1));  // stores z values
    const xw   = new Float32Array(N + 1);               // world X coords
    const yw   = new Float32Array(N + 1);               // world Y coords

    let zMin =  Infinity;
    let zMax = -Infinity;

    for (let k = 0; k <= N; k++) {
      xw[k] = -_R + k * step;
      yw[k] = -_R + k * step;
    }

    for (let j = 0; j <= N; j++) {
      const y = yw[j];
      for (let i = 0; i <= N; i++) {
        const x = xw[i];

        // 1. Rotate domain
        const xR = x * cosT + y * sinT;
        const yR = -x * sinT + y * cosT;

        // 2. Radial twist
        let xT = xR, yT = yR;
        if (twist !== 0) {
          const r   = Math.sqrt(xR * xR + yR * yR);
          const ang = twist * r;
          const ca  = Math.cos(ang), sa = Math.sin(ang);
          xT = xR * ca - yR * sa;
          yT = xR * sa + yR * ca;
        }

        // 3. B-scale + C-shift + axis flips
        const xArg = B * (sx * xT - Cx);
        const yArg = B * (sy * yT - Cy);

        // 4. Evaluate + transform
        let z = fn(xArg, yArg);
        if (!isFinite(z) || isNaN(z)) z = 0;
        z = Math.max(-zClamp, Math.min(zClamp, z));
        z = szSign * A * z + D;

        grid[j * (N + 1) + i] = z;
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
      }
    }

    if (zMin === zMax) { zMin -= 1; zMax += 1; }
    const zRange = zMax - zMin;

    // Helper: height t→color
    function colorAt(z) {
      const t = (z - zMin) / zRange;
      return FT3D.materials.heightToColor(t);
    }

    // ── Pass 2: fill LineSegments buffers ─────────────────────
    const posXArr = _geoX.attributes.position.array;
    const colXArr = _geoX.attributes.color.array;
    const posYArr = _geoY.attributes.position.array;
    const colYArr = _geoY.attributes.color.array;

    let px = 0, cx_ = 0;   // write heads for X-lines
    let py = 0, cy_ = 0;   // write heads for Y-lines

    // X-direction lines: for each row j, draw segments (i→i+1) at fixed j
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i < N; i++) {
        const zA = grid[j * (N + 1) + i];
        const zB = grid[j * (N + 1) + (i + 1)];
        const cA = colorAt(zA);
        const cB = colorAt(zB);

        // Vertex A
        posXArr[px++] = xw[i]; posXArr[px++] = yw[j]; posXArr[px++] = zA;
        colXArr[cx_++] = cA.r; colXArr[cx_++] = cA.g; colXArr[cx_++] = cA.b;
        // Vertex B
        posXArr[px++] = xw[i+1]; posXArr[px++] = yw[j]; posXArr[px++] = zB;
        colXArr[cx_++] = cB.r; colXArr[cx_++] = cB.g; colXArr[cx_++] = cB.b;
      }
    }

    // Y-direction lines: for each col i, draw segments (j→j+1) at fixed i
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j < N; j++) {
        const zA = grid[j * (N + 1) + i];
        const zB = grid[(j + 1) * (N + 1) + i];
        const cA = colorAt(zA);
        const cB = colorAt(zB);

        posYArr[py++] = xw[i]; posYArr[py++] = yw[j];   posYArr[py++] = zA;
        colYArr[cy_++] = cA.r; colYArr[cy_++] = cA.g; colYArr[cy_++] = cA.b;
        posYArr[py++] = xw[i]; posYArr[py++] = yw[j+1]; posYArr[py++] = zB;
        colYArr[cy_++] = cB.r; colYArr[cy_++] = cB.g; colYArr[cy_++] = cB.b;
      }
    }

    // Mark dirty
    _geoX.attributes.position.needsUpdate = true;
    _geoX.attributes.color.needsUpdate    = true;
    _geoY.attributes.position.needsUpdate = true;
    _geoY.attributes.color.needsUpdate    = true;

    _geoX.computeBoundingSphere();
    _geoY.computeBoundingSphere();

    FT3D.bus.emit("surface:updated", { hMin: zMin, hMax: zMax });
  };

  // ── Public API ───────────────────────────────────────────────

  Surface.getMesh       = function () { return _group; };
  Surface.getMaterial   = function () { return _mat; };
  Surface.getResolution = function () { return _N; };

  Surface.setResolution = function (n) {
    if (n === _N) return;
    const scene = FT3D.scene && FT3D.scene.getScene();
    if (scene && _group) scene.remove(_group);
    Surface.build(n);
    if (scene) scene.add(_group);
    FT3D.status.show("Resolution: " + n + "²", 1200);
  };

  // ── State subscriptions ──────────────────────────────────────

  const KEYS = ["A","B","Cx","Cy","D","theta","twist",
                "flipX","flipY","flipZ","base","domainRange","colorMode"];

  KEYS.forEach(k => FT3D.bus.on("state:" + k, FT3D.rafThrottle(Surface.update)));
  FT3D.bus.on("state:resolution", n => Surface.setResolution(n));

  // showWire doesn't apply to line-grid — silently ignore
  FT3D.bus.on("state:showWire", () => {});

  FT3D.log.info("geometry.js loaded (line-grid mode)");
})(window.FT3D);
