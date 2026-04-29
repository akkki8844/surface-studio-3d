/* ============================================================
   PRESETS — saved transformation states + view presets
   ============================================================ */

(function (FT3D) {
  "use strict";

  /** Built-in transformation presets the user can click to apply */
  FT3D.presets = [
    {
      id: "default",
      name: "Identity",
      description: "Reset — base function untouched.",
      state: {
        A: 1, B: 1, Cx: 0, Cy: 0, D: 0, theta: 0, twist: 0,
        flipX: false, flipY: false, flipZ: false,
      },
    },
    {
      id: "highWave",
      name: "High Wave",
      description: "Tall, slow waves rolling diagonally.",
      state: {
        A: 2.4, B: 0.6, Cx: 0, Cy: 0, D: 0.5, theta: 30 * FT3D.constants.DEG2RAD, twist: 0,
        flipX: false, flipY: false, flipZ: false,
      },
    },
    {
      id: "ripplePool",
      name: "Ripple Pool",
      description: "Compressed concentric ripples.",
      state: {
        A: 1.6, B: 1.8, Cx: 0, Cy: 0, D: 0, theta: 0, twist: 0,
        flipX: false, flipY: false, flipZ: false,
      },
      base: "rippleSin",
    },
    {
      id: "vortex",
      name: "Vortex",
      description: "Twisted spiral with strong curl.",
      state: {
        A: 1.4, B: 1.0, Cx: 0, Cy: 0, D: 0, theta: 45 * FT3D.constants.DEG2RAD, twist: 0.6,
        flipX: false, flipY: false, flipZ: false,
      },
    },
    {
      id: "valley",
      name: "Valley",
      description: "Deep central valley shifted off-center.",
      state: {
        A: 1.2, B: 0.8, Cx: 1.5, Cy: -1.5, D: -1, theta: 0, twist: 0,
        flipX: false, flipY: false, flipZ: true,
      },
      base: "paraboloid",
    },
    {
      id: "saddleStorm",
      name: "Saddle Storm",
      description: "Stretched saddle, rotated, with twist.",
      state: {
        A: 1.6, B: 0.9, Cx: 0, Cy: 0, D: 0, theta: 30 * FT3D.constants.DEG2RAD, twist: 0.3,
        flipX: false, flipY: false, flipZ: false,
      },
      base: "saddle",
    },
    {
      id: "calmLake",
      name: "Calm Lake",
      description: "Soft gentle interference.",
      state: {
        A: 0.6, B: 0.7, Cx: 0, Cy: 0, D: 0, theta: 0, twist: 0.05,
        flipX: false, flipY: false, flipZ: false,
      },
      base: "cosR2",
    },
    {
      id: "mountain",
      name: "Mountain",
      description: "Tall Gaussian peak.",
      state: {
        A: 3, B: 0.7, Cx: 0, Cy: 0, D: -0.5, theta: 0, twist: 0,
        flipX: false, flipY: false, flipZ: false,
      },
      base: "gaussian",
    },
  ];

  /** View presets — camera target + position offsets in world units */
  FT3D.viewPresets = {
    iso: {
      name: "Isometric",
      // Spherical: radius, theta (azimuth around Y), phi (polar from +Y)
      radius: 18,
      theta: Math.PI * 0.25,   // 45° around Y
      phi: Math.PI * 0.32,     // tilt from top
      target: [0, 0, 0],
      fov: 45,
    },
    top: {
      name: "Top",
      radius: 16,
      theta: 0,
      phi: 0.001,              // nearly straight down
      target: [0, 0, 0],
      fov: 45,
    },
    front: {
      name: "Front",
      radius: 16,
      theta: 0,
      phi: Math.PI * 0.5,
      target: [0, 0, 0],
      fov: 45,
    },
    side: {
      name: "Side",
      radius: 16,
      theta: Math.PI * 0.5,
      phi: Math.PI * 0.5,
      target: [0, 0, 0],
      fov: 45,
    },
  };

  /** Apply a preset (mutates state via FT3D.state.setMany) */
  FT3D.applyPreset = function (preset) {
    if (!preset) return;
    const patch = Object.assign({}, preset.state);
    if (preset.base) patch.base = preset.base;
    FT3D.state.setMany(patch);
    FT3D.bus.emit("preset:applied", preset);
    FT3D.status.show("Preset: " + preset.name);
  };

  /** Random transformation generator — useful for the Random button */
  FT3D.randomTransform = function () {
    const R = FT3D.math.random;
    return {
      A: R.snap(-2.4, 2.4, 0.05),
      B: R.snap(0.4, 2.4, 0.05),
      Cx: R.snap(-3, 3, 0.1),
      Cy: R.snap(-3, 3, 0.1),
      D: R.snap(-1.5, 1.5, 0.1),
      theta: R.snap(-Math.PI, Math.PI, FT3D.math.deg2rad(15)),
      twist: R.snap(-0.6, 0.6, 0.05),
      flipX: Math.random() < 0.18,
      flipY: Math.random() < 0.18,
      flipZ: Math.random() < 0.12,
    };
  };

  FT3D.log.info("presets.js loaded:", FT3D.presets.length, "presets");
})(window.FT3D);
