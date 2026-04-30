# Surface Studio — 3D Function Transformer

An interactive 3D mathematical surface visualizer. Explore 18 built-in functions and transform them in real-time with amplitude, frequency, phase shift, rotation, and radial twist. Built entirely with vanilla JavaScript and Three.js — no build step, no bundler, opens directly in the browser.

![Surface Studio screenshot](https://raw.githubusercontent.com/placeholder/surface-studio-3d/main/preview.png)

---

## Live Demo

**Open `index.html` directly in any modern browser.** No server required.

> Works in Chrome 90+, Firefox 88+, Edge 90+, Safari 15+.  
> Requires WebGL support (enabled by default in all modern browsers).

---

## Features

### 18 Mathematical Surfaces
| Category | Functions |
|---|---|
| Radial | Ripple, Mexican Hat, Gaussian Bell, Interference, Cone, Lens, Spiral |
| Trigonometric | Egg Crate, Twisted Sin, Cosine Pair |
| Polynomial | Saddle, Bowl (Paraboloid), Monkey Saddle, Hyperbolic |
| Exotic | Pyramid, Torus Sheet, Soft Checker, Dunes |

### Transformations — Applied as `z = A · f(B(x − Cₓ), B(y − Cᵧ)) + D`
- **A** — Vertical stretch / compress (−3 to +3)
- **B** — Horizontal frequency / compression (0.2 to 3)
- **Cₓ / Cᵧ** — Horizontal shift in X and Y (−5 to +5)
- **D** — Vertical shift up/down (−5 to +5)
- **θ** — Rotate the input domain around Z (−180° to +180°)
- **τ** — Radial twist — rotation proportional to distance from origin
- **Reflections** — Flip across X, Y, or Z axis independently

### 3D Visualization
- Line-grid surface rendering (X-parallel + Y-parallel polylines)
- Height-based vertex coloring with 5 color modes: **Height, Slope, Plasma, Viridis, Mono**
- Colored 3D axes (X = red, Y = green, Z = blue) with arrowheads and tick marks
- Ground grid in the XY plane
- Fog depth cueing
- Dark and light themes

### Camera Controls
| Input | Action |
|---|---|
| Left drag | Orbit |
| Right drag / Ctrl+drag | Pan |
| Scroll wheel | Zoom |
| Double-click | Reset view |
| Touch drag | Orbit |
| Pinch | Zoom |

### 8 Built-in Presets
Identity · High Wave · Ripple Pool · Vortex · Valley · Saddle Storm · Calm Lake · Mountain

### Live Equation HUD
Shows the full transformation formula updating in real-time:
```
z = 2.40 · sin(1.80(x), 1.80(y)) + 0.50   [rot 30°]
```
Plus a plain-English description: *"Ripple: stretched vertically ×2.4, horizontally compressed ×1.8…"*

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `1` `2` `3` `4` | Iso / Top / Front / Side view |
| `Space` | Toggle auto-rotate |
| `W` | Toggle wireframe |
| `G` | Toggle grid & axes |
| `C` | Cycle color mode |
| `T` | Toggle dark/light theme |
| `R` | Reset all transforms |
| `X` | Randomize transforms |
| `[` `]` | Previous / next function |
| `F` | Fullscreen |
| `?` | Help modal |
| `Shift+↑` `Shift+↓` | Fine-tune amplitude |

---

## Project Structure

```
surface-studio-3d/
├── index.html              # Entry point — all HTML, script load order
│
├── styles/
│   ├── theme.css           # CSS custom properties (dark + light theme tokens)
│   ├── main.css            # Body grid layout, topbar, modal, loading animation
│   ├── panel.css           # Glass panels, function card grid, preset cards
│   ├── controls.css        # Sliders, chip toggles, segmented controls, toolbar
│   └── hud.css             # Equation HUD, FPS pills, axis gizmo overlay
│
└── js/
    ├── core.js             # FT3D namespace, math helpers, EventEmitter, state machine, storage
    ├── functions.js        # 18 surface function definitions with metadata & sparklines
    ├── presets.js          # 8 transformation presets + random transform generator
    ├── shaders.js          # Reserved (standard materials active)
    ├── materials.js        # Color ramp system, LineBasicMaterial factory
    ├── geometry.js         # Line-grid BufferGeometry builder & real-time update loop
    ├── axes.js             # Colored 3D axes, arrowheads, ground grid, sprite labels
    ├── scene.js            # WebGLRenderer setup, lights, scene graph management
    ├── camera.js           # Spherical orbit camera, inertia, pan, touch, gizmo renderer
    ├── transformations.js  # Equation string builder + plain-English description generator
    ├── equation.js         # HUD sync on state changes
    ├── animation.js        # requestAnimationFrame loop, FPS counter, resize observer
    ├── ui.js               # Full panel wiring: sliders, toggles, function cards, presets
    ├── keyboard.js         # Global keyboard shortcut handler
    └── main.js             # Bootstrap sequence, WebGL error fallback, localStorage restore
```

**No `node_modules`. No build step. No bundler.** Three.js is loaded from a CDN `<script>` tag.

---

## Architecture

The app uses a **centralized reactive state machine** (`FT3D.state`) with an event bus (`FT3D.bus`). Every UI control calls `FT3D.state.set(key, value)`, which emits a `state:<key>` event. Geometry, equation HUD, and materials all subscribe independently and update themselves.

```
Slider input
    → FT3D.state.set("A", 2.4)
        → bus.emit("state:A", 2.4)
            → geometry.js: recompute all vertex positions
            → equation.js: rebuild equation string in HUD
            → transformations.js: regenerate plain-English description
```

State is auto-saved to `localStorage` and restored on next visit.

---

## Customization

### Adding a new surface function

Edit `js/functions.js` and append to the `FNS` array:

```js
{
  id: "myFn",
  label: "My Function",
  formula: "sin(x) * ln(y + 1)",
  formulaPretty: "sin x · ln(y+1)",
  description: "A brief description shown in the card.",
  category: "exotic",    // trig | poly | radial | exotic
  zClamp: 5,             // clamp extreme values for stability
  fn: function (x, y) {
    return Math.sin(x) * Math.log(Math.abs(y) + 1);
  },
},
```

### Adding a new color ramp

Edit `js/materials.js`, add an entry to `RAMPS`:

```js
const RAMPS = {
  // ...existing ramps...
  sunset: ["#1a0030","#6b0f6b","#c0392b","#e67e22","#f9ca24"],
};
```

Then add a corresponding button in `index.html` inside `#colorMode`:

```html
<button class="seg" data-mode="sunset">Sunset</button>
```

---

## Dependencies

| Library | Version | How loaded |
|---|---|---|
| [Three.js](https://threejs.org) | r160 | CDN — `unpkg.com` |

That's it. Everything else is vanilla JS / CSS.

---

## Browser Support

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Full support |
| Firefox 88+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Safari 15+ | ✅ Full support |
| Mobile Chrome/Safari | ✅ Touch orbit + pinch-zoom |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Issues and PRs welcome. When adding surfaces, keep `fn(x, y)` pure (no side effects) and set a sensible `zClamp` to avoid degenerate geometry on divergent functions.
