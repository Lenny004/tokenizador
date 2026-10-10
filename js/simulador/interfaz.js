import { CFG, EVT, clamp } from './nucleo.js';
import { NODE_TYPES, NodeFactory } from './grafo.js';
import { ESTACIONES, detalle } from './estaciones.js';

/**
 * Convierte el ratón sobre el canvas en acciones (conectar, arrastrar, pan, zoom).
 * @param {HTMLCanvasElement} canvas - `#stage`.
 * @param {NeuroFlowApp} app
 */
export class Controller {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app;
    this.renderer = app.renderer;

    this.mode = 'idle';   // idle | drag | pan | connect
    this.dragOffsets = [];
    this.connectFrom = null;
    this.panStart = null;
    this.moved = false;
    this._pendingDrag = null;

    this._bind();
  }

  /**
   * @param {PointerEvent|MouseEvent} e
   * @returns {{x:number, y:number}} Relativa al canvas.
   */
  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Registra los listeners; `wheel` no es pasivo para poder cancelar el scroll. */
  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._onDown(e));
    c.addEventListener('pointermove', (e) => this._onMove(e));
    c.addEventListener('pointerup',   (e) => this._onUp(e));
    c.addEventListener('pointercancel', (e) => this._onUp(e));
    c.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    c.addEventListener('dblclick', (e) => this._onDblClick(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * @param {number} wx
   * @param {number} wy - Px de mundo.
   * @returns {{node:Object, port:'in'|'out'}|null}
   */
  _portAt(wx, wy) {
    const rOut = CFG.PORT_R * 1.9 / this.renderer.cam.zoom;
    const rIn  = CFG.PORT_R * 1.9 / this.renderer.cam.zoom;
    for (const n of this.app.graph.nodes.values()) {
      const oy = n.y + n.h * 0.5;
      if (Math.hypot(wx - (n.x + n.w), wy - oy) <= rOut) return { node: n, port: 'out' };
      if (Math.hypot(wx - n.x, wy - oy) <= rIn) return { node: n, port: 'in' };
    }
    return null;
  }

  /**
   * Inicia conexión, arrastre, selección de arista o pan según lo que hay debajo.
   * @param {PointerEvent} e
   */
  _onDown(e) {
    const p = this._local(e);
    const wx = this.renderer.s2wx(p.x);
    const wy = this.renderer.s2wy(p.y);
    this.moved = false;

    const port = this._portAt(wx, wy);
    if (port && port.port === 'out' && e.button === 0) {
      this.mode = 'connect';
      this.connectFrom = port.node;
      this.canvas.classList.add('connecting');
      this.canvas.setPointerCapture(e.pointerId);
      this.renderer.setOverlay({ type:'connect', fromId: port.node.id, sx:p.x, sy:p.y, valid:false });
      return;
    }

    const node = this.renderer.hitTestNode(wx, wy);
    if (node && e.button === 0) {
      this.app.select({ kind:'node', id: node.id });

      // Se arrastra solo este nodo (no hay selección múltiple).
      this.mode = 'drag';
      this._pendingDrag = { node, wx, wy, ox: node.x, oy: node.y };
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.classList.add('grabbing');
      return;
    }

    const edge = this._edgeAt(p.x, p.y);
    if (edge && e.button === 0) {
      this.app.select({ kind:'edge', id: edge.id });
      return;
    }

    if (e.button === 0 || e.button === 1) {
      this.app.select(null);
      this.mode = 'pan';
      this.panStart = { x: p.x, y: p.y, cx: this.app.camera.x, cy: this.app.camera.y };
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.classList.add('grabbing');
    }
  }

  /**
   * @param {number} sx
   * @param {number} sy - Pantalla.
   * @returns {Object|null} Arista a menos de 9 px.
   */
  _edgeAt(sx, sy) {
    const graph = this.app.graph;
    const engine = this.app.engine;
    const TH = 9;
    for (const edge of graph.edges.values()) {
      const geo = engine.geoFor(edge);
      const pts = geo.pts;
      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = this.renderer.w2sx(pts[i]),     y1 = this.renderer.w2sy(pts[i + 1]);
        const x2 = this.renderer.w2sx(pts[i + 2]), y2 = this.renderer.w2sy(pts[i + 3]);
        if (this._segDist(sx, sy, x1, y1, x2, y2) < TH) return edge;
      }
    }
    return null;
  }

  /** @returns {number} Distancia del punto (px, py) al segmento. */
  _segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /**
   * Continúa la acción en curso o actualiza el cursor.
   * @param {PointerEvent} e
   */
  _onMove(e) {
    const p = this._local(e);
    const r = this.renderer;
    const wx = r.s2wx(p.x), wy = r.s2wy(p.y);

    if (this.mode === 'drag' && this._pendingDrag) {
      const d = this._pendingDrag;
      const dx = wx - d.wx, dy = wy - d.wy;
      if (!this.moved && Math.hypot(dx, dy) < 0.6) return;
      this.moved = true;
      d.node.x = d.ox + dx;
      d.node.y = d.oy + dy;
      this.app.graph._touch();
      this.app.bus.emit(EVT.NODE_MOVED, d.node);
      return;
    }

    if (this.mode === 'pan' && this.panStart) {
      const dx = (p.x - this.panStart.x) / this.app.camera.zoom;
      const dy = (p.y - this.panStart.y) / this.app.camera.zoom;
      this.app.camera.x = this.panStart.cx - dx;
      this.app.camera.y = this.panStart.cy - dy;
      this.app.bus.emit(EVT.CAMERA, this.app.camera);
      return;
    }

    if (this.mode === 'connect' && this.connectFrom) {
      const target = r.hitTestNode(wx, wy);
      const valid = !!(target && target.id !== this.connectFrom.id &&
                       !this.app.graph.hasEdge(this.connectFrom.id, target.id));
      r.setOverlay({ type:'connect', fromId: this.connectFrom.id, sx:p.x, sy:p.y, valid });
      return;
    }

    const overPort = this._portAt(wx, wy);
    this.canvas.style.cursor = overPort?.port === 'out' ? 'crosshair'
                             : r.hitTestNode(wx, wy) ? 'move'
                             : 'grab';
  }

  /**
   * Termina la acción; crea la arista si se suelta sobre otra caja.
   * @param {PointerEvent} e
   */
  _onUp(e) {
    const p = this._local(e);
    const r = this.renderer;
    const wx = r.s2wx(p.x), wy = r.s2wy(p.y);

    if (this.mode === 'connect' && this.connectFrom) {
      const target = r.hitTestNode(wx, wy);
      if (target && target.id !== this.connectFrom.id) {
        const edge = this.app.graph.addEdge(this.connectFrom.id, target.id, 1);
        if (edge) {
          this.app.bus.emit(EVT.TOAST, { msg:`🔗 ${this.connectFrom.label} → ${target.label}`, kind:'ok' });
          this.connectFrom.activation = 1;
          target.activation = 1;
        } else {
          this.app.bus.emit(EVT.TOAST, { msg:'⚠ Conexión duplicada o inválida', kind:'warn' });
        }
      }
      r.setOverlay(null);
      this.connectFrom = null;
    }

    this.mode = 'idle';
    this._pendingDrag = null;
    this.panStart = null;
    this.canvas.classList.remove('grabbing', 'connecting');
    try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  /**
   * Zoom hacia el ratón, entre `CFG.MIN_ZOOM` y `CFG.MAX_ZOOM`.
   * @param {WheelEvent} e
   */
  _onWheel(e) {
    e.preventDefault();
    const p = this._local(e);
    const cam = this.app.camera;
    const wx = this.renderer.s2wx(p.x);
    const wy = this.renderer.s2wy(p.y);

    const factor = Math.exp(-e.deltaY * 0.0013);
    const newZoom = clamp(cam.zoom * factor, CFG.MIN_ZOOM, CFG.MAX_ZOOM);
    if (newZoom === cam.zoom) return;

    cam.zoom = newZoom;
    // Mantiene fijo el punto bajo el ratón.
    cam.x = wx - (p.x - this.renderer.W * 0.5) / cam.zoom;
    cam.y = wy - (p.y - this.renderer.H * 0.5) / cam.zoom;

    this.app.bus.emit(EVT.CAMERA, cam);
  }

  /**
   * Selecciona la caja y enfoca su etiqueta en el inspector.
   * @param {MouseEvent} e
   */
  _onDblClick(e) {
    const p = this._local(e);
    const wx = this.renderer.s2wx(p.x), wy = this.renderer.s2wy(p.y);
    const node = this.renderer.hitTestNode(wx, wy);
    if (node) {
      this.app.select({ kind:'node', id: node.id });
      const input = document.querySelector('#inspector input[data-field="label"]');
      if (input) { input.focus(); input.select(); }
    }
  }
}

/**
 * Panel `#inspector`: muestra y edita la selección; escucha `SELECTION` y `NODE_OUTPUT`.
 * @param {HTMLElement} host
 * @param {NeuroFlowApp} app
 */
export class Inspector {
  constructor(host, app) {
    this.host = host;
    this.app = app;
    this.selection = null;
    app.bus.on(EVT.SELECTION, (sel) => this.render(sel));
    app.bus.on(EVT.NODE_OUTPUT, (n) => {
      if (this.selection?.kind === 'node' && this.selection.id === n.id) this._paintOutput(n);
    });
    this.render(null);
  }

  /**
   * Redibuja el panel para la selección.
   * @param {{kind:'node'|'edge', id:string}|null} sel
   */
  render(sel) {
    this.selection = sel;
    const h = this.host;

    if (!sel) {
      h.innerHTML = `
        <p class="panel-title">Inspector</p>
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          <p>Selecciona una caja o conexión<br>para editarla.<br><br>
          <kbd>Doble clic</kbd> sobre una caja<br>para editar su etiqueta.</p>
        </div>`;
      return;
    }

    if (sel.kind === 'node') {
      const n = this.app.graph.nodes.get(sel.id);
      if (!n) return this.render(null);
      const preset = NodeFactory.preset(n.type);
      const inDeg  = this.app.graph.in.get(n.id)?.size || 0;
      const outDeg = this.app.graph.out.get(n.id)?.size || 0;

      h.innerHTML = `
        <p class="panel-title">Caja · ${n.type}</p>
        <div class="badge-row">
          <span class="badge ok">IN ${inDeg}</span>
          <span class="badge ok">OUT ${outDeg}</span>
          <span class="badge">${preset.desc}</span>
        </div>

        <div class="field">
          <label>Salida de la estación</label>
          <pre class="salida-estacion" data-out="salida"></pre>
        </div>

        <div class="field">
          <label>ID único de evento</label>
          <input type="text" readonly value="${n.eventId}" />
        </div>

        <div class="field">
          <label>Etiqueta</label>
          <input type="text" data-field="label" value="${escapeHtml(n.label)}" maxlength="42" />
        </div>

        <div class="field">
          <label>Tipo de neurona</label>
          <select data-field="type">
            ${Object.entries(NODE_TYPES).map(([k, v]) =>
              `<option value="${k}" ${k === n.type ? 'selected' : ''}>${v.icon} ${v.label} · umbral ${v.threshold}</option>`
            ).join('')}
          </select>
        </div>

        <div class="field">
          <label>Umbral de disparo · <span data-out="threshold">${n.threshold}</span></label>
          <input type="range" min="0" max="4" step="1" data-field="threshold" value="${n.threshold}" />
        </div>

        <div class="field">
          <label>Peso sináptico · <span data-out="weight">${n.weight.toFixed(1)}</span></label>
          <input type="range" min="0.2" max="3" step="0.1" data-field="weight" value="${n.weight}" />
        </div>

        <div class="field">
          <label>Posición</label>
          <input type="text" readonly value="x:${Math.round(n.x)}  y:${Math.round(n.y)}" />
        </div>

        <button class="danger-btn" data-action="delete-node">🗑 Eliminar caja</button>
      `;
      this._paintOutput(n);
      this._wireNode(n);
      return;
    }

    if (sel.kind === 'edge') {
      const e = this.app.graph.edges.get(sel.id);
      if (!e) return this.render(null);
      const a = this.app.graph.nodes.get(e.from);
      const b = this.app.graph.nodes.get(e.to);

      h.innerHTML = `
        <p class="panel-title">Conexión sináptica</p>
        <div class="badge-row">
          <span class="badge">${a ? a.icon + ' ' + escapeHtml(a.label) : '?'}</span>
          <span class="badge ok">→</span>
          <span class="badge">${b ? b.icon + ' ' + escapeHtml(b.label) : '?'}</span>
        </div>

        <div class="field">
          <label>ID de arista</label>
          <input type="text" readonly value="${e.id}" />
        </div>

        <div class="field">
          <label>Peso sináptico · <span data-out="w">${e.weight.toFixed(1)}</span></label>
          <input type="range" min="0.2" max="3" step="0.1" data-field="weight" value="${e.weight}" />
        </div>

        <button class="danger-btn" data-action="delete-edge">🗑 Eliminar conexión</button>
      `;

      const range = h.querySelector('input[data-field="weight"]');
      const out   = h.querySelector('[data-out="w"]');
      range.addEventListener('input', () => {
        e.weight = parseFloat(range.value);
        out.textContent = e.weight.toFixed(1);
        this.app.bus.emit(EVT.GRAPH_CHANGED, { reason:'edge:weight', id: e.id });
      });
      h.querySelector('[data-action="delete-edge"]').addEventListener('click', () => {
        this.app.graph.removeEdge(e.id);
        this.app.select(null);
      });
    }
  }

  /** Muestra la salida de la estación. */
  _paintOutput(n) {
    const pre = this.host.querySelector('[data-out="salida"]');
    if (!pre) return;
    pre.classList.toggle('pendiente', !!ESTACIONES[n.type]?.pendiente);
    pre.classList.toggle('error', !!n.error);
    if (n.error) pre.textContent = '⚠ ' + n.error;
    else if (ESTACIONES[n.type]?.pendiente) {
      pre.textContent = 'en desarrollo\n— el dato pasa sin cambios —\n\n' + detalle(n.salida);
    } else pre.textContent = detalle(n.salida);
  }

  /**
   * Conecta los campos del formulario de caja.
   * @param {Object} n
   */
  _wireNode(n) {
    const h = this.host;

    const labelIn = h.querySelector('input[data-field="label"]');
    labelIn.addEventListener('input', () => {
      n.label = labelIn.value || 'Sin nombre';
      this.app.bus.emit(EVT.NODE_UPDATED, n);
    });

    const typeSel = h.querySelector('select[data-field="type"]');
    typeSel.addEventListener('change', () => {
      const preset = NodeFactory.preset(typeSel.value);
      n.type = typeSel.value;
      n.color = preset.color;
      n.glow  = preset.glow;
      n.icon  = preset.icon;
      n.threshold = preset.threshold;
      this.app.bus.emit(EVT.NODE_UPDATED, n);
      this.app.bus.emit(EVT.GRAPH_CHANGED, { reason:'node:type', id:n.id });
      this.render({ kind:'node', id:n.id });
    });

    const thr = h.querySelector('input[data-field="threshold"]');
    const thrOut = h.querySelector('[data-out="threshold"]');
    thr.addEventListener('input', () => {
      n.threshold = parseInt(thr.value, 10);
      thrOut.textContent = n.threshold;
      this.app.bus.emit(EVT.NODE_UPDATED, n);
    });

    const wgt = h.querySelector('input[data-field="weight"]');
    const wgtOut = h.querySelector('[data-out="weight"]');
    wgt.addEventListener('input', () => {
      n.weight = parseFloat(wgt.value);
      wgtOut.textContent = n.weight.toFixed(1);
      this.app.bus.emit(EVT.NODE_UPDATED, n);
    });

    h.querySelector('[data-action="delete-node"]').addEventListener('click', () => {
      this.app.graph.removeNode(n.id);
      this.app.select(null);
    });
  }
}

/**
 * Escapa texto para insertarlo en HTML.
 * @param {*} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

/**
 * Muestra avisos en `#toasts` con cada evento `TOAST`.
 * @param {HTMLElement} host
 * @param {EventBus} bus
 */
export class ToastManager {
  constructor(host, bus) {
    this.host = host;
    bus.on(EVT.TOAST, ({ msg, kind }) => this.push(msg, kind));
  }
  /**
   * Agrega un aviso visible 2.4 s.
   * @param {string} msg
   * @param {''|'ok'|'warn'} [kind='']
   */
  push(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    this.host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    }, 2400);
  }
}
