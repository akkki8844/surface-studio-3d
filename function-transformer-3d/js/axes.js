/* ============================================================
   AXES — colored 3D axes with arrowheads, ground grid,
   origin sphere, and sprite axis labels (X / Y / Z).
   Surface is in the XY plane. Z = height.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Axes = FT3D.axes = {};

  let _group = null;

  const COL = {
    x: 0xef4444,   // red
    y: 0x10b981,   // green
    z: 0x3b82f6,   // blue
  };

  Axes.build = function (length) {
    length = length || 7;

    if (_group) {
      disposeGroup(_group);
      _group = null;
    }

    _group = new THREE.Group();
    _group.name = "FT3D_Axes";

    const size = length * 1.5;

    // ── Ground grid in XY plane ─────────────────────────────
    {
      const div  = Math.round(size * 2);
      const step = (size * 2) / div;
      const pts  = [];
      for (let i = 0; i <= div; i++) {
        const t = -size + i * step;
        pts.push(-size, t, 0, size, t, 0);   // parallel to X
        pts.push(t, -size, 0, t, size, 0);   // parallel to Y
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
      const dark = FT3D.state.get("theme") !== "light";
      const mat  = new THREE.LineBasicMaterial({
        color: dark ? 0x1e293b : 0xc0ccd8,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      _group.add(new THREE.LineSegments(geo, mat));
      _group.userData.gridMat = mat;

      // Center cross — slightly brighter
      const cg = new THREE.BufferGeometry();
      cg.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        -size, 0, 0, size, 0, 0,
        0, -size, 0, 0, size, 0,
      ]), 3));
      const cm = new THREE.LineBasicMaterial({
        color: dark ? 0x334155 : 0x94a3b8,
        transparent: true, opacity: 0.7, depthWrite: false,
      });
      _group.add(new THREE.LineSegments(cg, cm));
      _group.userData.centerMat = cm;
    }

    // ── Axis lines ─────────────────────────────────────────
    function addLine(ax, ay, az, bx, by, bz, hex, op) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(
        new Float32Array([ax, ay, az, bx, by, bz]), 3
      ));
      const mat = new THREE.LineBasicMaterial({
        color: hex, transparent: true, opacity: op == null ? 1 : op,
      });
      _group.add(new THREE.Line(geo, mat));
    }

    addLine( 0, 0, 0,  length, 0, 0, COL.x);
    addLine(-length * 0.5, 0, 0,  0, 0, 0, COL.x, 0.3);
    addLine( 0, 0, 0,  0, length, 0, COL.y);
    addLine( 0, -length * 0.5, 0,  0, 0, 0, COL.y, 0.3);
    addLine( 0, 0, 0,  0, 0, length, COL.z);
    addLine( 0, 0, -length * 0.4,  0, 0, 0, COL.z, 0.3);

    // ── Arrowheads ─────────────────────────────────────────
    function addHead(x, y, z, axis, hex) {
      const geo = new THREE.ConeGeometry(0.12, 0.38, 14);
      const mat = new THREE.MeshBasicMaterial({ color: hex });
      const m   = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (axis === "x") { m.rotation.z = -Math.PI / 2; m.position.x += 0.19; }
      else if (axis === "y") { /* default cone points +Y */ m.position.y += 0.19; }
      else if (axis === "z") { m.rotation.x = Math.PI / 2; m.position.z += 0.19; }
      _group.add(m);
    }

    addHead(length, 0, 0, "x", COL.x);
    addHead(0, length, 0, "y", COL.y);
    addHead(0, 0, length, "z", COL.z);

    // ── Origin sphere ───────────────────────────────────────
    {
      const geo = new THREE.SphereGeometry(0.09, 16, 12);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      _group.add(new THREE.Mesh(geo, mat));
    }

    // ── Tick marks ─────────────────────────────────────────
    {
      const pts = [];
      const ts  = 0.06;
      for (let v = 1; v <= Math.floor(length); v++) {
        pts.push(v, -ts, 0, v, ts, 0);
        pts.push(-ts, v, 0, ts, v, 0);
        pts.push(-ts, 0, v, ts, 0, v);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
      const dark = FT3D.state.get("theme") !== "light";
      const mat  = new THREE.LineBasicMaterial({ color: dark ? 0x475569 : 0x64748b, transparent: true, opacity: 0.7 });
      _group.add(new THREE.LineSegments(geo, mat));
    }

    // ── Axis labels (sprites) ───────────────────────────────
    addLabel("X", length + 0.6, 0, 0, "#ef4444");
    addLabel("Y", 0, length + 0.6, 0, "#10b981");
    addLabel("Z", 0, 0, length + 0.6, "#3b82f6");

    // Theme reactions
    FT3D.bus.on("state:theme", (theme) => {
      const dark = theme !== "light";
      if (_group.userData.gridMat)   _group.userData.gridMat.color.set(dark ? 0x1e293b : 0xc0ccd8);
      if (_group.userData.centerMat) _group.userData.centerMat.color.set(dark ? 0x334155 : 0x94a3b8);
    });

    return _group;
  };

  function addLabel(txt, x, y, z, cssColor) {
    const size = 80;
    const cv   = document.createElement("canvas");
    cv.width = size; cv.height = size;
    const ctx  = cv.getContext("2d");
    ctx.fillStyle = cssColor;
    ctx.font = `700 ${Math.round(size * 0.62)}px ui-monospace,Menlo,monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, size / 2, size / 2 + size * 0.05);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.position.set(x, y, z);
    sp.scale.set(0.72, 0.72, 0.72);
    _group.add(sp);
  }

  function disposeGroup(g) {
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  Axes.getGroup    = function () { return _group; };
  Axes.setVisible  = function (on) { if (_group) _group.visible = !!on; };
  Axes.setLength   = function (l) { Axes.build(l); };

  FT3D.log.info("axes.js loaded");
})(window.FT3D);
