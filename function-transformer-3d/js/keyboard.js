/* ============================================================
   KEYBOARD — global shortcut handler.
   Maps key combos → state mutations or UI actions.
   All shortcuts are documented in the help modal.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const KB = FT3D.keyboard = {};

  // Ignore keypresses when focus is inside a text input/select
  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
  }

  function onKeyDown(e) {
    if (isTyping()) return;

    const key = e.key.toLowerCase();

    switch (key) {
      // ── View presets ──────────────────────────────────────
      case "1": FT3D.bus.emit("camera:goTo", "iso");   break;
      case "2": FT3D.bus.emit("camera:goTo", "top");   break;
      case "3": FT3D.bus.emit("camera:goTo", "front"); break;
      case "4": FT3D.bus.emit("camera:goTo", "side");  break;

      // ── Playback ─────────────────────────────────────────
      case " ": {
        e.preventDefault();
        const next = !FT3D.state.get("autoRotate");
        FT3D.state.set("autoRotate", next);
        const btn = FT3D.dom.byId("autoRotate");
        if (btn) {
          btn.classList.toggle("active", next);
          btn.setAttribute("aria-pressed", next);
        }
        FT3D.status.show(next ? "Auto-rotate ON" : "Auto-rotate OFF");
        break;
      }

      // ── Display toggles ───────────────────────────────────
      case "w": {
        const next = !FT3D.state.get("showWire");
        FT3D.state.set("showWire", next);
        const btn = FT3D.dom.byId("wireToggle");
        if (btn) btn.classList.toggle("active", next);
        FT3D.status.show(next ? "Wireframe ON" : "Wireframe OFF");
        break;
      }
      case "g": {
        const next = !FT3D.state.get("showAxes");
        FT3D.state.set("showAxes", next);
        const btn = FT3D.dom.byId("axesToggle");
        if (btn) btn.classList.toggle("active", next);
        FT3D.status.show(next ? "Grid ON" : "Grid OFF");
        break;
      }
      case "c": {
        FT3D.ui.cycleColorMode();
        break;
      }

      // ── Theme ─────────────────────────────────────────────
      case "t": {
        const next = FT3D.state.get("theme") === "dark" ? "light" : "dark";
        FT3D.state.set("theme", next);
        document.documentElement.setAttribute("data-theme", next);
        FT3D.status.show("Theme: " + next);
        break;
      }

      // ── Actions ───────────────────────────────────────────
      case "r": {
        FT3D.ui.reset();
        break;
      }
      case "x": {
        FT3D.ui.randomize();
        break;
      }

      // ── Function navigation ───────────────────────────────
      case "[": {
        FT3D.ui.cycleFn(-1);
        break;
      }
      case "]": {
        FT3D.ui.cycleFn(+1);
        break;
      }

      // ── Fullscreen ────────────────────────────────────────
      case "f": {
        FT3D.ui.toggleFullscreen();
        break;
      }

      // ── Help modal ────────────────────────────────────────
      case "?":
      case "/": {
        FT3D.ui.openHelp && FT3D.ui.openHelp();
        break;
      }
      case "escape": {
        FT3D.ui.closeHelp && FT3D.ui.closeHelp();
        break;
      }

      // ── Fine-tune A with arrow keys ───────────────────────
      case "arrowup": {
        if (e.shiftKey) {
          e.preventDefault();
          const a = Math.min(3, FT3D.math.round(FT3D.state.get("A") + 0.1, 0.1));
          FT3D.state.set("A", a);
          syncSlider("rngA", "valA", a, "A");
        }
        break;
      }
      case "arrowdown": {
        if (e.shiftKey) {
          e.preventDefault();
          const a = Math.max(-3, FT3D.math.round(FT3D.state.get("A") - 0.1, 0.1));
          FT3D.state.set("A", a);
          syncSlider("rngA", "valA", a, "A");
        }
        break;
      }
    }
  }

  function syncSlider(rangeId, valId, value, stateKey) {
    const el  = FT3D.dom.byId(rangeId);
    const vel = FT3D.dom.byId(valId);
    if (el)  { el.value = value; FT3D.dom.setRangeFill(el); }
    if (vel) vel.textContent = FT3D.transforms.displayValue(stateKey, value);
  }

  KB.init = function () {
    document.addEventListener("keydown", onKeyDown);
    FT3D.log.info("keyboard.js loaded");
  };

})(window.FT3D);
