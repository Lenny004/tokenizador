import { CFG, EVT, SpatialHash, GEO, roundRect } from './nucleo.js';
import { ESTACIONES, resumen } from './estaciones.js';

/* ==================================================================
   8 · RENDERER  (layered rendering + culling + LOD + sprites cacheados)
   ================================================================== */
/**
 * Dibuja el lienzo en capas: rejilla (cacheada en un canvas aparte), aristas, pulsos,
 * nodos con su vista previa y la conexión en curso. Solo dibuja lo que cae en pantalla.
 *
 * @param {HTMLCanvasElement} canvas - El `#stage`.
 * @param {GraphModel} graph
 * @param {SimulationEngine} engine
 * @param {{x:number, y:number, zoom:number}} camera - Centro de la vista en píxeles de mundo y zoom.
 * @param {EventBus} bus - Escucha `NODE_MOVED`, `NODE_ADDED`, `NODE_REMOVED` y `NODE_UPDATED`
 *   (reconstruir el índice espacial) y `CAMERA` (repintar la rejilla).
 */
export class Renderer {
  constructor(canvas, graph, engine, camera, bus) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.graph  = graph;
    this.engine = engine;
    this.cam    = camera;
    this.bus    = bus;

    this.dpr = 1; this.W = 0; this.H = 0;

    // Capa estática cacheada (optimización #1)
    this.gridCanvas = document.createElement('canvas');
    this._gridDirty = true;

    this.showGrid = true;

    // Sprite de glow pre-renderizado (optimización: cero createRadialGradient/frame)
    this.glowSprite = this._makeGlowSprite();

    this.spatial = new SpatialHash();
    this._indexDirty = true;
    this._queryBuf = [];

    // Suscripciones EDA
    bus.on(EVT.NODE_MOVED,   () => { this._indexDirty = true; });
    bus.on(EVT.NODE_ADDED,   () => { this._indexDirty = true; });
    bus.on(EVT.NODE_REMOVED, () => { this._indexDirty = true; });
    bus.on(EVT.CAMERA,       () => { this._gridDirty = true; });
    bus.on(EVT.NODE_UPDATED, () => { this._indexDirty = true; });
  }

  /* ---------- Glow sprite ---------- */
  _makeGlowSprite() {
    const S = 96;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(190,235,255,0.92)');
    grd.addColorStop(0.42, 'rgba(56,189,248,0.45)');
    grd.addColorStop(1.00, 'rgba(56,189,248,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    return c;
  }

  /** Ajusta el tamaño interno del canvas a su tamaño en pantalla × devicePixelRatio (máximo 2). */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(1, rect.width);
    this.H = Math.max(1, rect.height);
    this.canvas.width  = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.gridCanvas.width  = this.canvas.width;
    this.gridCanvas.height = this.canvas.height;
    this._gridDirty = true;
  }

  /* ---------- Coordenadas ---------- */
  // Conversión de coordenadas: w2s = mundo → pantalla, s2w = pantalla → mundo (píxeles CSS del canvas).
  w2sx(wx) { return (wx - this.cam.x) * this.cam.zoom + this.W * 0.5; }
  w2sy(wy) { return (wy - this.cam.y) * this.cam.zoom + this.H * 0.5; }
  s2wx(sx) { return (sx - this.W * 0.5) / this.cam.zoom + this.cam.x; }
  s2wy(sy) { return (sy - this.H * 0.5) / this.cam.zoom + this.cam.y; }

  /* ---------- Capa de rejilla (solo se repinta si la cámara cambia) ---------- */
  _paintGrid() {
    const g = this.gridCanvas.getContext('2d');
    const W = this.W, H = this.H, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const z = this.cam.zoom;
    let step = CFG.GRID_SIZE * z;
    // LOD de rejilla: si está muy densa, duplicamos el paso
    while (step < 18) step *= 2;
    while (step > 130) step *= 0.5;

    const ox = ((-this.cam.x * z) % step + step) % step;
    const oy = ((-this.cam.y * z) % step + step) % step;

    g.fillStyle = 'rgba(56,189,248,0.085)';
    const r = z > 1.4 ? 1.4 : 1;
    for (let x = ox; x < W + step; x += step) {
      for (let y = oy; y < H + step; y += step) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Viñeta sutil
    const vg = g.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.78);
    vg.addColorStop(0, 'rgba(5,7,13,0)');
    vg.addColorStop(1, 'rgba(5,7,13,0.72)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  }

  /* ---------- Índice espacial ---------- */
  _rebuildIndex() {
    this.spatial.clear();
    for (const n of this.graph.nodes.values()) this.spatial.insert(n);
    this._indexDirty = false;
  }

  /**
   * @param {number} wx
   * @param {number} wy - Punto en píxeles de mundo.
   * @returns {Object|null} El nodo que contiene el punto (el dibujado encima), o `null`.
   */
  hitTestNode(wx, wy) {
    if (this._indexDirty) this._rebuildIndex();
    return this.spatial.hitTest(wx, wy);
  }

  /* ================================================================
     RENDER PRINCIPAL
     ================================================================ */
  /**
   * Dibuja un fotograma completo.
   * @param {number} dt - Segundos desde el fotograma anterior (este método no lo usa).
   */
  render(dt) {
    const ctx = this.ctx;
    const { W, H, dpr } = this;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);

    // --- Capa 1: rejilla cacheada ---
    if (this.showGrid) {
      if (this._gridDirty) { this._paintGrid(); this._gridDirty = false; }
      ctx.drawImage(this.gridCanvas, 0, 0, W, H);
    }

    if (this._indexDirty) this._rebuildIndex();

    const z = this.cam.zoom;
    const vx0 = this.s2wx(-120), vy0 = this.s2wy(-120);
    const vx1 = this.s2wx(W + 120), vy1 = this.s2wy(H + 120);

    // --- Capa 2: aristas ---
    this._drawEdges(ctx, vx0, vy0, vx1, vy1, z);

    // --- Capa 3: pulsos (composición aditiva) ---
    this._drawPulses(ctx, z);

    // --- Capa 4: nodos ---
    this._drawNodes(ctx, vx0, vy0, vx1, vy1, z);

    // --- Capa 5: overlay de conexión ---
    this._drawOverlay(ctx, z);
  }

  /* ---------- ARISTAS ---------- */
  _drawEdges(ctx, vx0, vy0, vx1, vy1, z) {
    const graph = this.graph;
    const engine = this.engine;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // PASO A: aristas inactivas en un solo batch (menos cambios de estado)
    ctx.beginPath();
    const activeEdges = [];
    for (const edge of graph.edges.values()) {
      const a = graph.nodes.get(edge.from);
      const b = graph.nodes.get(edge.to);
      if (!a || !b) continue;
      // Frustum culling
      if (Math.max(a.x, b.x) < vx0 || Math.min(a.x, b.x) > vx1) continue;
      if (Math.max(a.y, b.y) < vy0 || Math.min(a.y, b.y) > vy1) continue;

      const geo = engine.geoFor(edge);
      const pts = geo.pts;
      const sx = this.w2sx(pts[0]), sy = this.w2sy(pts[1]);
      ctx.moveTo(sx, sy);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(this.w2sx(pts[i]), this.w2sy(pts[i + 1]));
      }
      if (edge.signal > 0.02) activeEdges.push(edge);
    }
    ctx.strokeStyle = '#1b2740';
    ctx.lineWidth = Math.max(1, 2 * z);
    ctx.stroke();

    // PASO B: aristas activas con glow (pocas, coste controlado)
    if (activeEdges.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const edge of activeEdges) {
        const geo = engine.geoFor(edge);
        const pts = geo.pts;
        const s = edge.signal;
        const src = this.graph.nodes.get(edge.from);

        ctx.beginPath();
        ctx.moveTo(this.w2sx(pts[0]), this.w2sy(pts[1]));
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(this.w2sx(pts[i]), this.w2sy(pts[i + 1]));
        }
        ctx.strokeStyle = `rgba(${src ? src.glow : '56,189,248'},${0.16 + s * 0.72})`;
        ctx.lineWidth = Math.max(1.2, (1.8 + s * 2.6) * z);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------- PULSOS ---------- */
  _drawPulses(ctx, z) {
    const pulses = this.engine.pulses;
    if (pulses.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sprite = this.glowSprite;

    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      const edge = this.graph.edges.get(p.edgeId);
      if (!edge) continue;
      const geo = this.engine.geoFor(edge);

      // Cabeza del pulso
      const pt = GEO.pointAt(geo, p.t);
      const sx = this.w2sx(pt[0]);
      const sy = this.w2sy(pt[1]);

      const size = (26 + 14 * Math.sin(p.t * Math.PI)) * z;
      ctx.drawImage(sprite, sx - size, sy - size, size * 2, size * 2);

      // Núcleo brillante
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.6, 3.4 * z), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.fill();

      // Cola (trail) — segmento por detrás de la cabeza
      const tailT = Math.max(0, p.t - 0.16);
      const tail = GEO.pointAt(geo, tailT);
      const tx = this.w2sx(tail[0]);
      const ty = this.w2sy(tail[1]);
      const grad = ctx.createLinearGradient(tx, ty, sx, sy);
      grad.addColorStop(0, `rgba(${p.hue},0)`);
      grad.addColorStop(1, `rgba(${p.hue},0.85)`);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.5, 4 * z);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- NODOS ---------- */
  _drawNodes(ctx, vx0, vy0, vx1, vy1, z) {
    const graph = this.graph;
    const lodText = z >= CFG.LOD_TEXT_ZOOM;
    const lodPort = z >= CFG.LOD_PORT_ZOOM;

    // Separamos activos de inactivos para minimizar cambios de estado (shadowBlur)
    const active = [];
    const idle   = [];

    for (const n of graph.nodes.values()) {
      // Frustum culling
      if (n.x + n.w < vx0 || n.x > vx1 || n.y + n.h < vy0 || n.y > vy1) continue;
      (n.activation > 0.04 ? active : idle).push(n);
    }

    // --- Inactivos: batch sin sombras ---
    for (const n of idle) this._paintNode(ctx, n, z, lodText, lodPort, false);
    // --- Activos: con glow ---
    for (const n of active) this._paintNode(ctx, n, z, lodText, lodPort, true);
  }

  /**
   * Dibuja una caja: halo, cuerpo, barra de color, puntos de umbral, textos, vista previa y puertos.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} n - Nodo.
   * @param {number} z - Zoom actual.
   * @param {boolean} lodText - Dibujar textos (zoom >= `CFG.LOD_TEXT_ZOOM`).
   * @param {boolean} lodPort - Dibujar puertos y umbral (zoom >= `CFG.LOD_PORT_ZOOM`).
   * @param {boolean} withGlow - Dibujar el halo (nodos activos).
   */
  _paintNode(ctx, n, z, lodText, lodPort, withGlow) {
    const sx = this.w2sx(n.x);
    const sy = this.w2sy(n.y);
    const w  = n.w * z;
    const h  = n.h * z;
    const r  = Math.min(14 * z, h * 0.32);
    const act = n.activation;

    // Halo exterior
    if (withGlow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = (w * 0.9) * (0.5 + act * 0.6);
      ctx.globalAlpha = act * 0.55;
      ctx.drawImage(
        this.glowSprite,
        sx + w/2 - halo, sy + h/2 - halo,
        halo * 2, halo * 2
      );
      ctx.restore();
    }

    // Cuerpo
    roundRect(ctx, sx, sy, w, h, r);
    const bodyGrad = ctx.createLinearGradient(sx, sy, sx, sy + h);
    bodyGrad.addColorStop(0, act > 0.03 ? '#182338' : '#111827');
    bodyGrad.addColorStop(1, '#0b1120');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Borde
    ctx.lineWidth = Math.max(1, (act > 0.03 ? 2.2 : 1.4) * z);
    ctx.strokeStyle = act > 0.03
      ? `rgba(${n.glow},${0.45 + act * 0.55})`
      : '#243149';
    ctx.stroke();

    // Barra de acento izquierda (color del tipo)
    ctx.save();
    roundRect(ctx, sx, sy, w, h, r);
    ctx.clip();
    const bar = ctx.createLinearGradient(sx, sy, sx, sy + h);
    bar.addColorStop(0, n.color);
    bar.addColorStop(1, `rgba(${n.glow},0.25)`);
    ctx.fillStyle = bar;
    ctx.fillRect(sx, sy, Math.max(2.5, 4.5 * z), h);
    ctx.restore();

    // Indicador de umbral (barras de potencial)
    if (lodPort && n.threshold > 0) {
      const bx = sx + w - 12 * z;
      const by = sy + h - 10 * z;
      for (let i = 0; i < n.threshold; i++) {
        const filled = n.potential > i;
        ctx.beginPath();
        ctx.arc(bx - i * 8 * z, by, 2.4 * z, 0, Math.PI * 2);
        ctx.fillStyle = filled ? `rgba(${n.glow},0.95)` : 'rgba(100,116,139,0.35)';
        ctx.fill();
      }
    }

    // Texto (LOD: se omite con zoom bajo → ahorro real de fillText)
    if (lodText) {
      ctx.save();
      roundRect(ctx, sx, sy, w, h, r);
      ctx.clip();

      ctx.fillStyle = '#e6edf7';
      ctx.font = `600 ${Math.round(12.5 * z)}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      const label = n.label.length > 23 ? n.label.slice(0, 22) + '…' : n.label;
      ctx.fillText(`${n.icon} ${label}`, sx + 14 * z, sy + h * 0.36);

      ctx.fillStyle = act > 0.03 ? `rgba(${n.glow},0.95)` : '#64748b';
      ctx.font = `500 ${Math.round(9.5 * z)}px ${'SFMono-Regular, ui-monospace, monospace'}`;
      ctx.fillText(n.eventId, sx + 14 * z, sy + h * 0.70);

      ctx.restore();

      // Vista previa del resultado real, en letra pequeña DEBAJO de la caja.
      this._paintPreview(ctx, n, sx, sy + h, w, z);
    }

    // Puertos
    if (lodPort) {
      const pr = Math.max(3, CFG.PORT_R * z);
      const cy = sy + h * 0.5;

      // Entrada (izquierda)
      if (this.graph.in.get(n.id)?.size > 0 || n.threshold > 0) {
        ctx.beginPath();
        ctx.arc(sx, cy, pr, 0, Math.PI * 2);
        ctx.fillStyle = '#0b1120';
        ctx.fill();
        ctx.lineWidth = Math.max(1, 1.8 * z);
        ctx.strokeStyle = `rgba(${n.glow},0.85)`;
        ctx.stroke();
      }

      // Salida (derecha) — siempre visible
      ctx.beginPath();
      ctx.arc(sx + w, cy, pr * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = act > 0.03 ? `rgba(${n.glow},1)` : '#1e293b';
      ctx.fill();
      ctx.lineWidth = Math.max(1, 1.8 * z);
      ctx.strokeStyle = n.color;
      ctx.stroke();
    }
  }

  /* ---------- VISTA PREVIA DE LA ESTACIÓN ---------- */
  /**
   * Escribe debajo de la caja una línea corta (máximo 34 caracteres): el error en rojo,
   * "en desarrollo" en ámbar para estaciones pendientes o el `resumen()` de su salida.
   * No dibuja nada si la caja todavía no tiene salida.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} n - Nodo.
   * @param {number} sx
   * @param {number} sy - Esquina inferior izquierda de la caja en pantalla.
   * @param {number} w - Ancho de la caja en pantalla.
   * @param {number} z - Zoom actual.
   */
  _paintPreview(ctx, n, sx, sy, w, z) {
    let texto = '', color = '#94a3b8';
    if (n.error)                         { texto = '⚠ ' + n.error; color = '#f87171'; }
    else if (ESTACIONES[n.type]?.pendiente) { texto = '⏳ en desarrollo'; color = '#fbbf24'; }
    else if (n.salida !== undefined)     { texto = resumen(n.salida); color = '#cbd5e1'; }
    if (!texto) return;

    // Recortamos para que no se encime con la siguiente caja.
    const max = 34;
    if (texto.length > max) texto = texto.slice(0, max - 1) + '…';
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `500 ${Math.round(10 * z)}px SFMono-Regular, ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(texto, sx + 4 * z, sy + 8 * z, w + 40 * z);
    ctx.restore();
  }

  /* ---------- OVERLAY (conexión en curso / selección) ---------- */
  _drawOverlay(ctx, z) {
    const ov = this._overlay;
    if (!ov) return;

    if (ov.type === 'connect') {
      const a = this.graph.nodes.get(ov.fromId);
      if (!a) return;
      const x0 = this.w2sx(a.x + a.w), y0 = this.w2sy(a.y + a.h * 0.5);
      const x1 = ov.sx, y1 = ov.sy;
      const dx = Math.max(60, Math.abs(x1 - x0) * 0.46);

      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -performance.now() / 28;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + dx, y0, x1 - dx, y1, x1, y1);
      ctx.strokeStyle = 'rgba(56,189,248,0.9)';
      ctx.lineWidth = Math.max(1.5, 2.4 * z);
      ctx.stroke();
      ctx.restore();

      // Punto destino
      ctx.beginPath();
      ctx.arc(x1, y1, 5, 0, Math.PI * 2);
      ctx.fillStyle = ov.valid ? '#4ade80' : '#f87171';
      ctx.fill();
    }
  }

  /**
   * @param {{type:'connect', fromId:string, sx:number, sy:number, valid:boolean}|null} o -
   *   Conexión que se está arrastrando (punta en pantalla) o `null` para quitarla.
   */
  setOverlay(o) { this._overlay = o; }
}
