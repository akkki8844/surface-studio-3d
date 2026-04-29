/* ============================================================
   EQUATION — syncs the HUD equation panel and status bar
   with the current transformation state.
   Updates on every relevant state change via the event bus.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Equation = FT3D.equation = {};

  // DOM refs (lazily fetched once)
  let _elBase, _elTemplate, _elLive, _elDesc;

  function ensureRefs() {
    if (_elBase) return;
    _elBase     = FT3D.dom.byId("eqBaseText");
    _elTemplate = FT3D.dom.byId("eqTemplate");   // static, just confirm it exists
    _elLive     = FT3D.dom.byId("eqLiveText");
    _elDesc     = FT3D.dom.byId("eqDescription");
  }

  /** Full render of the HUD equation panel. */
  Equation.render = function () {
    ensureRefs();
    const state = FT3D.state.get();
    const fn    = FT3D.getFn(state.base);

    // Base function line
    if (_elBase) _elBase.textContent = fn.formula;

    // Live equation — plain text (no MathML needed, looks clean in mono)
    if (_elLive) {
      const eq = FT3D.transforms.buildEquation(state);
      _elLive.textContent = "z = " + eq;
    }

    // Description
    if (_elDesc) {
      _elDesc.textContent = FT3D.transforms.buildDescription(state);
    }
  };

  /** Throttled render so rapid slider moves don't choke */
  const _throttledRender = FT3D.rafThrottle(Equation.render);

  Equation.init = function () {
    ensureRefs();

    // Subscribe to every parameter that affects the equation
    const keys = ["A","B","Cx","Cy","D","theta","twist","flipX","flipY","flipZ","base","domainRange"];
    keys.forEach(k => FT3D.bus.on("state:" + k, _throttledRender));

    // Initial render
    Equation.render();
  };

  FT3D.log.info("equation.js loaded");
})(window.FT3D);
