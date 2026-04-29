/* ============================================================
   TRANSFORMATIONS — human-readable description builder and
   slider-value formatting helpers.  The actual math transform
   is applied inside geometry.js during vertex generation.
   This module owns the "plain English" and equation strings.
   ============================================================ */

(function (FT3D) {
  "use strict";

  const Transforms = FT3D.transforms = {};

  // ── Numeric formatting ───────────────────────────────────────

  /** Format a coefficient for display, collapsing 1 / -1 / 0 */
  Transforms.fmtCoeff = function (v, digits) {
    digits = digits == null ? 2 : digits;
    const a = Math.abs(v);
    if (a < FT3D.constants.EPS) return "0";
    const s = parseFloat(a.toFixed(digits));
    const neg = v < 0;
    if (Math.abs(s - 1) < 0.001) return neg ? "−" : "";
    return (neg ? "−" : "") + s;
  };

  /** Format a generic value, sign-aware */
  Transforms.fmtVal = function (v, digits) {
    digits = digits == null ? 2 : digits;
    if (Math.abs(v) < FT3D.constants.EPS) return "0";
    return parseFloat(v.toFixed(digits)).toString();
  };

  /** Format a signed addend: "+2.5" or "−1.0" */
  Transforms.fmtAddend = function (v, digits) {
    digits = digits == null ? 2 : digits;
    if (Math.abs(v) < FT3D.constants.EPS) return "";
    const a = parseFloat(Math.abs(v).toFixed(digits));
    return (v > 0 ? " + " : " − ") + a;
  };

  // ── Equation builder ─────────────────────────────────────────

  /**
   * Build the live equation string from current state.
   * Returns an HTML string with <span class="num"> wrappers for styling.
   */
  Transforms.buildEquation = function (state) {
    const M   = FT3D.math;
    const A   = state.A;
    const B   = state.B;
    const Cx  = state.Cx;
    const Cy  = state.Cy;
    const D   = state.D;
    const theta  = state.theta;
    const twist  = state.twist;
    const flipX  = state.flipX;
    const flipY  = state.flipY;
    const flipZ  = state.flipZ;
    const baseLabel = FT3D.getFn(state.base).formulaPretty || FT3D.getFn(state.base).formula;

    // A coefficient
    const aAbs   = Math.abs(A);
    const aNeg   = (flipZ ? -1 : 1) * (A < 0 ? -1 : 1) < 0;
    const aSign  = aNeg ? "−" : "";
    const aStr   = Math.abs(Math.abs(A) - 1) < 0.001
      ? aSign
      : aSign + parseFloat(aAbs.toFixed(2));

    // Build inner argument substitution: B(sx·x − Cx, sy·y − Cy)
    const sx = flipY ? "−" : "";
    const sy = flipX ? "−" : "";

    // x argument
    const BisOne = Math.abs(B - 1) < 0.001;
    let xArg = sx + "x";
    if (Math.abs(Cx) > FT3D.constants.EPS) {
      xArg += Cx > 0 ? " − " + parseFloat(Math.abs(Cx).toFixed(2))
                     : " + " + parseFloat(Math.abs(Cx).toFixed(2));
    }
    if (!BisOne) xArg = parseFloat(B.toFixed(2)) + "(" + xArg + ")";

    // y argument
    let yArg = sy + "y";
    if (Math.abs(Cy) > FT3D.constants.EPS) {
      yArg += Cy > 0 ? " − " + parseFloat(Math.abs(Cy).toFixed(2))
                     : " + " + parseFloat(Math.abs(Cy).toFixed(2));
    }
    if (!BisOne) yArg = parseFloat(B.toFixed(2)) + "(" + yArg + ")";

    // Substitute into base function label
    let inner = baseLabel
      .replace(/\bx\b/g, xArg)
      .replace(/\by\b/g, yArg);

    let eq = "";

    if (aStr === "" || aStr === "−") {
      eq = aStr + inner;
    } else {
      eq = aStr + " · " + inner;
    }

    // D shift
    if (Math.abs(D) > FT3D.constants.EPS) {
      eq += D > 0
        ? " + " + parseFloat(D.toFixed(2))
        : " − " + parseFloat(Math.abs(D).toFixed(2));
    }

    // Append annotations for rotation and twist
    const extras = [];
    if (Math.abs(theta) > 0.01) {
      extras.push("rot " + Math.round(theta * FT3D.constants.RAD2DEG) + "°");
    }
    if (Math.abs(twist) > 0.01) {
      extras.push("twist " + parseFloat(twist.toFixed(2)));
    }
    if (extras.length) eq += "  [" + extras.join(", ") + "]";

    return eq;
  };

  // ── Plain-English description ─────────────────────────────────

  Transforms.buildDescription = function (state) {
    const parts = [];
    const M     = FT3D.math;
    const A     = state.A;
    const B     = state.B;
    const Cx    = state.Cx;
    const Cy    = state.Cy;
    const D     = state.D;
    const theta = state.theta;
    const twist = state.twist;

    const aMag = Math.abs(A);
    const isIdentity =
      Math.abs(A - 1) < 0.001 && Math.abs(B - 1) < 0.001 &&
      Math.abs(Cx) < 0.001 && Math.abs(Cy) < 0.001 && Math.abs(D) < 0.001 &&
      Math.abs(theta) < 0.01 && Math.abs(twist) < 0.01 &&
      !state.flipX && !state.flipY && !state.flipZ;

    if (isIdentity) {
      return "Identity — surface matches the base function exactly.";
    }

    const fn = FT3D.getFn(state.base);

    if (Math.abs(aMag - 1) > 0.015) {
      parts.push(aMag > 1
        ? `stretched vertically ×${parseFloat(aMag.toFixed(2))}`
        : `compressed vertically to ×${parseFloat(aMag.toFixed(2))}`);
    }
    if (A < 0) parts.push("negated (amplitude flipped)");
    if (state.flipZ) parts.push("reflected across the Z=0 plane");

    if (Math.abs(B - 1) > 0.015) {
      parts.push(B > 1
        ? `horizontally compressed ×${parseFloat(B.toFixed(2))}`
        : `horizontally stretched ×${parseFloat((1 / B).toFixed(2))}`);
    }

    if (Math.abs(Cx) > 0.015 || Math.abs(Cy) > 0.015) {
      const shifts = [];
      if (Math.abs(Cx) > 0.015) shifts.push(`x ${Cx > 0 ? "right" : "left"} ${parseFloat(Math.abs(Cx).toFixed(2))}`);
      if (Math.abs(Cy) > 0.015) shifts.push(`y ${Cy > 0 ? "forward" : "back"} ${parseFloat(Math.abs(Cy).toFixed(2))}`);
      parts.push("shifted " + shifts.join(" and "));
    }

    if (Math.abs(D) > 0.015) {
      parts.push(D > 0
        ? `raised +${parseFloat(D.toFixed(2))}`
        : `lowered ${parseFloat(D.toFixed(2))}`);
    }

    if (Math.abs(theta) > 0.01) {
      const deg = Math.round(theta * FT3D.constants.RAD2DEG);
      parts.push(`rotated ${deg > 0 ? "+" : ""}${deg}° around Z`);
    }

    if (Math.abs(twist) > 0.01) {
      parts.push(`twisted radially (τ=${parseFloat(twist.toFixed(2))})`);
    }

    if (state.flipX) parts.push("reflected in Y axis");
    if (state.flipY) parts.push("reflected in X axis");

    if (parts.length === 0) return "Subtle change — adjustments near identity.";

    const list = parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];

    return fn.label + ": " + list + ".";
  };

  // ── Value display formatters for sliders ─────────────────────

  Transforms.displayValue = function (key, val) {
    switch (key) {
      case "A":
      case "B":      return parseFloat(val).toFixed(2);
      case "Cx":
      case "Cy":
      case "D":      return (val >= 0 ? "+" : "") + parseFloat(val).toFixed(2);
      case "theta":  return Math.round(val * FT3D.constants.RAD2DEG) + "°";
      case "twist":  return (val >= 0 ? "+" : "") + parseFloat(val).toFixed(2);
      case "domainRange": return parseFloat(val).toFixed(1);
      default:       return parseFloat(val).toFixed(2);
    }
  };

  FT3D.log.info("transformations.js loaded");
})(window.FT3D);
