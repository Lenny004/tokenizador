// Núcleo del simulador: configuración, utilidades, EventBus (bus de eventos),
// pool de objetos, índice espacial y geometría de las conexiones.
/**
 * Configuración fija del simulador. Distancias en píxeles de "mundo" (antes del zoom),
 * tiempos en segundos; `*_HL` son vidas medias del decaimiento exponencial.
 * @type {Readonly<Object<string, number>>}
 */
export const CFG = Object.freeze({
  GRID_SIZE:        32,
  NODE_W:          196,
  NODE_H:           78,
  PORT_R:            7,
  PULSE_VELOCITY:  520,     // px mundo / segundo
  REFRACTORY:      0.09,    // s entre disparo y disparo
  MAX_FIRES:        32,     // anti-bucle infinito
  POTENTIAL_HL:    1.6,     // vida media del potencial (s)
  SIGNAL_HL:       0.45,    // vida media del brillo de arista (s)
  ACTIVATION_HL:   0.42,    // vida media de la activación de nodo (s)
  MIN_ZOOM:        0.22,
  MAX_ZOOM:        3.2,
  BEZIER_SAMPLES:   26,
  LOD_TEXT_ZOOM:   0.55,
  LOD_PORT_ZOOM:   0.40,
  SPATIAL_CELL:    200,
});

/**
 * Limita `v` al rango [a, b].
 * @param {number} v
 * @param {number} a - Mínimo.
 * @param {number} b - Máximo.
 * @returns {number}
 */
export const clamp  = (v,a,b) => v < a ? a : (v > b ? b : v);
/**
 * Tiempo actual en **segundos** (a partir de `performance.now()`).
 * @returns {number}
 */
export const now    = () => performance.now() / 1000;

// Estado del módulo: contador que solo incrementa `uid()`.
let __seq = 0;
/** ID único, corto y monótono — base del "event id" de cada caja. */
/**
 * @param {string} prefix - Prefijo, por ejemplo `"N"`, `"E"` o `"EVT"`.
 * @returns {string} Formato `PREFIJO-sss-rrrr`: secuencia en base 36 (3+ caracteres) y 4 caracteres aleatorios.
 */
export const uid = (prefix) =>
  `${prefix}-${(++__seq).toString(36).padStart(3,'0')}-${Math.random().toString(36).slice(2,6)}`;

/** roundRect con fallback (Safari < 16). */
/**
 * Traza (sin rellenar ni dibujar el borde) un rectángulo con esquinas redondeadas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h - En píxeles de pantalla.
 * @param {number} r - Radio; se limita a la mitad del lado más corto.
 */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}

/* ==================================================================
   1 · EVENT BUS  (EDA — patrón Observer + cola anti-reentrancia)
   ------------------------------------------------------------------
   Los módulos avisan sus cambios (grafo, selección, cámara, simulación)
   publicando eventos; quien necesite reaccionar se suscribe.
   ================================================================== */
/**
 * Nombres de los eventos del EventBus y lo que lleva cada uno (payload):
 * - `NODE_ADDED` / `NODE_REMOVED`: el nodo. Emitidos por `GraphModel`.
 * - `NODE_MOVED`: el nodo arrastrado. Emitido por `Controller`.
 * - `NODE_UPDATED`: el nodo editado. Emitido por `Inspector`.
 * - `EDGE_ADDED` / `EDGE_REMOVED`: la arista. Emitidos por `GraphModel`.
 * - `GRAPH_CHANGED`: `{ reason, id }`, por ejemplo `reason: 'node:add'`.
 * - `SELECTION`: `{ kind: 'node'|'edge', id }` o `null`. Emitido por `NeuroFlowApp.select()`.
 * - `CAMERA`: el objeto cámara `{ x, y, zoom }`.
 * - `SIM_STATE`: el estado nuevo (`SimState`).
 * - `SIM_FIRE`: `{ nodeId, eventId }` cuando un nodo dispara; `NeuroFlowApp` ejecuta ahí la estación.
 * - `SIM_SIGNAL`: `{ nodeId, edgeId }` cuando un pulso llega a un nodo.
 * - `TOAST`: `{ msg, kind }`, con `kind` `''`, `'ok'` o `'warn'`.
 * - `NODE_OUTPUT`: el nodo, después de guardar su `salida`.
 */
export const EVT = Object.freeze({
  NODE_ADDED:    'node:added',
  NODE_REMOVED:  'node:removed',
  NODE_MOVED:    'node:moved',
  NODE_UPDATED:  'node:updated',
  EDGE_ADDED:    'edge:added',
  EDGE_REMOVED:  'edge:removed',
  GRAPH_CHANGED: 'graph:changed',
  SELECTION:     'selection:changed',
  CAMERA:        'camera:changed',
  SIM_STATE:     'sim:state',
  SIM_FIRE:      'sim:fire',
  SIM_SIGNAL:    'sim:signal',
  TOAST:         'ui:toast',
  NODE_OUTPUT:   'node:output',   // una estación terminó su paso real
});

/**
 * Bus de eventos con cola: `emit()` encola y, si no se está despachando ya, vacía la cola
 * de forma síncrona en orden de llegada. Un error en un handler se registra con
 * `console.error` y no detiene a los demás.
 */
export class EventBus {
  constructor() {
    this._handlers = new Map();
    this._queue    = [];
    this._flushing = false;
    this._depth    = 0;
    this.stats     = { emitted: 0, handled: 0, maxQueue: 0 };
  }

  /**
   * Suscribe un handler a un tipo de evento.
   * @param {string} type - Uno de los valores de `EVT`.
   * @param {function(*, string): void} fn - Recibe `(payload, type)`.
   * @param {boolean} [once=false] - Si es `true`, se da de baja después de la primera llamada.
   * @returns {function(): boolean} Función que da de baja la suscripción.
   */
  on(type, fn, once = false) {
    let set = this._handlers.get(type);
    if (!set) { set = new Set(); this._handlers.set(type, set); }
    const h = { fn, once };
    set.add(h);
    return () => set.delete(h);
  }

  /**
   * Da de baja todas las suscripciones de `fn` a `type`.
   * @param {string} type
   * @param {Function} fn
   */
  off(type, fn) {
    const set = this._handlers.get(type);
    if (!set) return;
    for (const h of set) if (h.fn === fn) set.delete(h);
  }

  /**
   * Emite un evento. Se ENCOLA para evitar reentrancia:
   * un handler puede emitir sin corromper el dispatch en curso.
   * @param {string} type - Uno de los valores de `EVT`.
   * @param {*} [payload] - Datos del evento (ver `EVT`).
   */
  emit(type, payload) {
    this._queue.push({ type, payload });
    this.stats.emitted++;
    if (this._queue.length > this.stats.maxQueue) this.stats.maxQueue = this._queue.length;
    if (this._depth === 0) this._flush();
  }

  /** Despacha la cola hasta vaciarla, incluidos los eventos que emitan los propios handlers. */
  _flush() {
    this._depth++;
    try {
      while (this._queue.length) {
        const { type, payload } = this._queue.shift();
        const set = this._handlers.get(type);
        if (!set || set.size === 0) continue;
        // Copia defensiva para permitir unsubscribe durante el dispatch.
        const snapshot = Array.from(set);
        for (const h of snapshot) {
          if (h.once) set.delete(h);
          try { h.fn(payload, type); this.stats.handled++; }
          catch (err) { console.error(`[EventBus] handler "${type}"`, err); }
        }
      }
    } finally {
      this._depth--;
    }
  }
}

/* ==================================================================
   2 · OBJECT POOL  (cero asignaciones en el hot loop)
   ================================================================== */
/**
 * Reutiliza objetos para no crear basura en cada fotograma.
 * @param {function(): Object} factory - Crea un objeto nuevo.
 * @param {function(Object): void} reset - Limpia un objeto antes de guardarlo.
 * @param {number} [initial=0] - Objetos creados por adelantado.
 * @param {number} [cap=1024] - Máximo de objetos libres guardados; los que sobran se descartan.
 */
export class ObjectPool {
  constructor(factory, reset, initial = 0, cap = 1024) {
    this._factory = factory;
    this._reset   = reset;
    this._free    = [];
    this._cap     = cap;
    this.created  = 0;
    this.reused   = 0;
    for (let i = 0; i < initial; i++) { this._free.push(factory()); this.created++; }
  }
  /**
   * @returns {Object} Un objeto libre, o uno nuevo si no hay.
   */
  acquire() {
    if (this._free.length) { this.reused++; return this._free.pop(); }
    this.created++;
    return this._factory();
  }
  /**
   * Devuelve un objeto al pool (lo limpia con `reset`), salvo que el pool esté lleno.
   * @param {Object} obj
   */
  release(obj) {
    if (this._free.length >= this._cap) return;
    this._reset(obj);
    this._free.push(obj);
  }
  get size() { return this._free.length; }
}

/* ==================================================================
   3 · SPATIAL HASH  (hit-testing O(1) en promedio)
   ================================================================== */
/**
 * Divide el mundo en celdas cuadradas para encontrar rápido qué nodo hay en un punto.
 * Se reconstruye entera (`clear` + `insert`) cuando los nodos cambian.
 * @param {number} [cell=CFG.SPATIAL_CELL] - Lado de la celda en píxeles de mundo.
 */
export class SpatialHash {
  constructor(cell = CFG.SPATIAL_CELL) {
    this.cell = cell;
    this.buckets = new Map();
  }
  _key(cx, cy) { return (cx * 73856093) ^ (cy * 19349663); }

  clear() { this.buckets.clear(); }

  /**
   * Registra el nodo en todas las celdas que toca su rectángulo.
   * @param {{x:number,y:number,w:number,h:number}} node
   */
  insert(node) {
    const c = this.cell;
    const x0 = Math.floor(node.x / c), x1 = Math.floor((node.x + node.w) / c);
    const y0 = Math.floor(node.y / c), y1 = Math.floor((node.y + node.h) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = this._key(cx, cy);
        let b = this.buckets.get(k);
        if (!b) { b = []; this.buckets.set(k, b); }
        b.push(node);
      }
    }
  }

  /** Devuelve el primer nodo que contiene el punto (px,py) en coords mundo. */
  hitTest(px, py) {
    const k = this._key(Math.floor(px / this.cell), Math.floor(py / this.cell));
    const b = this.buckets.get(k);
    if (!b) return null;
    // Iteramos en reversa: el último insertado = el dibujado encima.
    for (let i = b.length - 1; i >= 0; i--) {
      const n = b[i];
      if (px >= n.x && px <= n.x + n.w && py >= n.y && py <= n.y + n.h) return n;
    }
    return null;
  }

  /** Candidatos dentro de un AABB (para culling de selección múltiple, etc.). */
  queryRect(x, y, w, h, out = []) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor(x / c), x1 = Math.floor((x + w) / c);
    const y0 = Math.floor(y / c), y1 = Math.floor((y + h) / c);
    const seen = new Set();
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const b = this.buckets.get(this._key(cx, cy));
        if (!b) continue;
        for (const n of b) {
          if (seen.has(n.id)) continue;
          seen.add(n.id);
          if (n.x + n.w >= x && n.x <= x + w && n.y + n.h >= y && n.y <= y + h) out.push(n);
        }
      }
    }
    return out;
  }
}

/* ==================================================================
   6 · GEOMETRÍA DE ARISTAS  (bezier precalculada en Float32Array)
   ================================================================== */
/**
 * Geometría de las aristas: curva de Bézier cúbica del puerto de salida de `a`
 * (borde derecho) al de entrada de `b` (borde izquierdo), muestreada en
 * `CFG.BEZIER_SAMPLES` tramos rectos.
 */
export const GEO = {
  /**
   * @param {Object} a - Nodo origen.
   * @param {Object} b - Nodo destino.
   * @param {Float32Array} [buffer] - Arreglo a reutilizar si tiene el tamaño correcto.
   * @returns {{pts: Float32Array, p0x:number, p0y:number, p3x:number, p3y:number, length:number}}
   *   `pts` alterna x, y; `length` se deja en 0 (se calcula con `approxLength`).
   */
  build(a, b, buffer) {
    const S = CFG.BEZIER_SAMPLES;
    const p0x = a.x + a.w,          p0y = a.y + a.h * 0.5;
    const p3x = b.x,                p3y = b.y + b.h * 0.5;
    const dx  = Math.max(72, Math.abs(p3x - p0x) * 0.46);
    const c1x = p0x + dx, c1y = p0y;
    const c2x = p3x - dx, c2y = p3y;

    const pts = buffer && buffer.length === (S + 1) * 2
      ? buffer
      : new Float32Array((S + 1) * 2);

    for (let i = 0; i <= S; i++) {
      const t  = i / S, mt = 1 - t;
      const A  = mt * mt * mt, B = 3 * mt * mt * t;
      const C  = 3 * mt * t * t, D = t * t * t;
      pts[i * 2]     = A * p0x + B * c1x + C * c2x + D * p3x;
      pts[i * 2 + 1] = A * p0y + B * c1y + C * c2y + D * p3y;
    }
    return { pts, p0x, p0y, p3x, p3y, length: 0 };
  },

  /** Punto sobre la polilínea en t∈[0,1] — escribe en _p[0], _p[1]. */
  _p: new Float32Array(2),
  pointAt(geo, t) {
    const S = CFG.BEZIER_SAMPLES;
    const f = clamp(t, 0, 1) * S;
    const i = Math.min(S - 1, Math.floor(f));
    const k = f - i;
    const pts = geo.pts;
    this._p[0] = pts[i * 2]     + (pts[(i + 1) * 2]     - pts[i * 2])     * k;
    this._p[1] = pts[i * 2 + 1] + (pts[(i + 1) * 2 + 1] - pts[i * 2 + 1]) * k;
    return this._p;
  },

  /** Longitud aproximada (para velocidad constante percibida). */
  approxLength(geo) {
    const pts = geo.pts;
    let len = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const dx = pts[i] - pts[i - 2];
      const dy = pts[i + 1] - pts[i - 1];
      len += Math.hypot(dx, dy);
    }
    return len;
  },
};
