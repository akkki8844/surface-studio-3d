/* ============================================================
   MAIN — bootstrap.  Dependency order matters:
   core → functions → presets → shaders → materials
   → geometry → axes → scene → camera → transforms
   → equation → animation → ui → keyboard
   ============================================================ */

(function (FT3D) {
  "use strict";

  function boot() {
    FT3D.log.info("Booting…");

    // 1. Theme
    const saved = FT3D.storage.load();
    const theme = (saved && saved.theme) || "dark";
    FT3D.state.set("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);

    // 2. Canvas
    const canvas = FT3D.dom.byId("gl");
    const stage  = FT3D.dom.byId("stage");
    if (!canvas || !stage) { FT3D.log.error("Canvas not found"); return; }

    // Size the canvas backing store to match its CSS size
    function syncCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w   = stage.clientWidth;
      const h   = stage.clientHeight;
      if (w > 0 && h > 0) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = w + "px";
        canvas.style.height = h + "px";
      }
    }
    syncCanvasSize();

    // 3. Scene (renderer + lights + surface + axes added inside)
    let renderer;
    try {
      renderer = FT3D.scene.init(canvas);
      if (!renderer) throw new Error("init returned null");
    } catch (e) {
      FT3D.log.error("WebGL init failed:", e);
      showWebGLError(stage);
      return;
    }

    // 4. Camera (pass just the canvas for event listeners)
    FT3D.camera.init(canvas);
    FT3D.camera.goTo("iso");
    FT3D.camera.updatePosition(true);

    // 5. UI panels
    FT3D.ui.init();

    // 6. Equation HUD
    FT3D.equation.init();

    // 7. Keyboard
    FT3D.keyboard.init();

    // 8. Render loop
    const scene = FT3D.scene.getScene();
    FT3D.anim.init(renderer, scene, FT3D.camera.getCamera());
    FT3D.anim.start();

    // 9. Restore persisted params (optional, non-critical)
    if (saved) {
      const SAFE = ["A","B","Cx","Cy","D","theta","twist",
                    "flipX","flipY","flipZ","colorMode","resolution",
                    "domainRange","showWire","showAxes","autoRotate","base","theme"];
      const patch = {};
      SAFE.forEach(k => { if (saved[k] != null) patch[k] = saved[k]; });
      FT3D.state.setMany(patch);
    }

    // 10. Auto-save on changes
    FT3D.bus.on("state:change", FT3D.debounce(() => {
      FT3D.storage.save(FT3D.state.snapshot());
    }, 800));

    // 11. Remove loading overlay (after first rendered frame)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      FT3D.ui.hideLoader();
      FT3D.status.show("Drag to orbit  •  Scroll to zoom  •  ? for shortcuts", 3000);
    }));

    // 12. First-run help hint
    if (!localStorage.getItem("ft3d.v2.visited")) {
      localStorage.setItem("ft3d.v2.visited", "1");
      setTimeout(() => FT3D.status.show("Press ? to see all keyboard shortcuts", 3000), 4000);
    }

    FT3D.log.info("Boot complete ✓");
  }

  function showWebGLError(stage) {
    stage.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:20px;
        font-family:system-ui,sans-serif;color:#e2e8f0;
        background:#07090c;padding:40px;text-align:center;">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
             stroke="#ef4444" stroke-width="1.5">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v4m0 4h.01"/>
        </svg>
        <h2 style="margin:0;font-size:18px;font-weight:700;">WebGL unavailable</h2>
        <p style="margin:0;color:#94a3b8;max-width:340px;line-height:1.6;font-size:14px;">
          This app requires WebGL. Try Chrome, Firefox, or Edge with
          hardware acceleration enabled in browser settings.
        </p>
      </div>`;
    const ov = FT3D.dom.byId("loadingOverlay");
    if (ov) ov.style.display = "none";
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(window.FT3D);
