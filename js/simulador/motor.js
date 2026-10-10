import { CFG, EVT, ObjectPool, GEO } from './nucleo.js';

// Motor de simulación: estados IDLE → RUNNING ⇄ PAUSED; los nodos acumulan potencial y disparan al llegar al umbral.
export const SimState = Object.freeze({ IDLE:'IDLE', RUNNING:'RUNNING', PAUSED:'PAUSED' });

/**
 * Avanza pulsos, disparos y decaimientos; `update(dt)` se llama en cada fotograma.
 * @param {GraphModel} graph
 * @param {EventBus} bus
 */
export class SimulationEngine {
  constructor(graph, bus) {
    this.graph  = graph;
    this.bus    = bus;
    this.state  = SimState.IDLE;
    this.elapsed = 0;

    this.pulses     = [];        // activos (array plano, sin alloc)
    this.fireTimers = [];        // { nodeId, at }
    this.flashQueue = [];        // { nodeId, at }  (botón Iluminar)
    this.firedCount = new Map();

    this.pool = new ObjectPool(
      () => ({ edgeId:null, t:0, speed:1, hue:'56,189,248', life:0 }),
      (p) => { p.edgeId = null; p.t = 0; p.life = 0; },
      128, 2048
    );

    this.stats = { fires:0, signals:0, peakPulses:0 };
  }

  /** Reinicia y dispara los nodos raíz (o, sin raíces, el de más salidas). */
  start() {
    this.reset();
    this.state = SimState.RUNNING;

    const roots = this.graph.roots();
    if (roots.length === 0 && this.graph.nodeCount > 0) {
      let best = null, bestDeg = -1;
      for (const n of this.graph.nodes.values()) {
        const d = this.graph.out.get(n.id).size;
        if (d > bestDeg) { bestDeg = d; best = n; }
      }
      if (best) this._fire(best);
    } else {
      for (const n of roots) this._fire(n);
    }

    this.bus.emit(EVT.SIM_STATE, this.state);
    this.bus.emit(EVT.TOAST, { msg:`▶ Simulación iniciada · ${roots.length} fuente(s)`, kind:'ok' });
  }

  pause() {
    if (this.state !== SimState.RUNNING) return;
    this.state = SimState.PAUSED;
    this.bus.emit(EVT.SIM_STATE, this.state);
    this.bus.emit(EVT.TOAST, { msg:'⏸ Pausado' });
  }

  resume() {
    if (this.state !== SimState.PAUSED) return;
    this.state = SimState.RUNNING;
    this.bus.emit(EVT.SIM_STATE, this.state);
  }

  /** Reinicia y vuelve a IDLE. */
  stop() {
    this.reset();
    this.state = SimState.IDLE;
    this.bus.emit(EVT.SIM_STATE, this.state);
    this.bus.emit(EVT.TOAST, { msg:'⏹ Detenido' });
  }

  /** Pone en cero pulsos, temporizadores y el estado de nodos y aristas (incluida `salida`). */
  reset() {
    for (let i = 0; i < this.pulses.length; i++) this.pool.release(this.pulses[i]);
    this.pulses.length = 0;
    this.fireTimers.length = 0;
    this.flashQueue.length = 0;
    this.firedCount.clear();
    this.stats.fires = this.stats.signals = this.stats.peakPulses = 0;
    this.elapsed = 0;

    for (const n of this.graph.nodes.values()) {
      n.activation = 0; n.potential = 0; n.state = 'idle';
      n.salida = undefined; n.error = null;   // borra resultados de la corrida anterior
    }
    for (const e of this.graph.edges.values()) { e.signal = 0; e.flow = 0; }
  }

  /**
   * Emite `SIM_FIRE` y lanza un pulso por arista saliente (máx. `CFG.MAX_FIRES` por corrida).
   * @param {Object} node
   */
  _fire(node) {
    const count = this.firedCount.get(node.id) || 0;
    if (count >= CFG.MAX_FIRES) return;      // guarda anti-bucle
    this.firedCount.set(node.id, count + 1);

    node.activation = 1;
    node.potential  = 0;
    node.state      = 'firing';
    this.stats.fires++;

    this.bus.emit(EVT.SIM_FIRE, { nodeId: node.id, eventId: node.eventId });

    const outSet = this.graph.out.get(node.id);
    if (!outSet) return;
    for (const eid of outSet) {
      const edge = this.graph.edges.get(eid);
      if (!edge) continue;
      const geo = this._geo(edge);
      const p = this.pool.acquire();
      p.edgeId = eid;
      p.t      = 0;
      p.speed  = CFG.PULSE_VELOCITY / Math.max(120, geo.length || 240);
      p.hue    = node.glow;
      p.life   = 0;
      this.pulses.push(p);
    }
    if (this.pulses.length > this.stats.peakPulses) this.stats.peakPulses = this.pulses.length;
  }

  /**
   * Suma el peso al destino y agenda su disparo si llega al umbral.
   * @param {Object} pulse
   */
  _arrive(pulse) {
    const edge = this.graph.edges.get(pulse.edgeId);
    if (!edge) return;
    const target = this.graph.nodes.get(edge.to);
    if (!target) return;

    this.stats.signals++;
    edge.signal = 1;
    edge.flow   = 1;

    target.potential += edge.weight;
    target.activation = Math.min(1, target.activation + 0.7);

    this.bus.emit(EVT.SIM_SIGNAL, { nodeId: target.id, edgeId: edge.id });

    if (target.potential >= target.threshold) {
      target.potential = 0;
      this.fireTimers.push({ nodeId: target.id, at: this.elapsed + CFG.REFRACTORY });
    }
  }

  /** Ilumina las cajas conectadas en cascada, por profundidad. */
  illuminate() {
    const depth = new Map();
    const queue = [];
    for (const n of this.graph.roots()) { depth.set(n.id, 0); queue.push(n); }
    for (const n of this.graph.nodes.values()) {
      if (!depth.has(n.id)) { depth.set(n.id, 0); queue.push(n); }
    }
    let head = 0;
    while (head < queue.length) {
      const n = queue[head++];
      const d = depth.get(n.id);
      for (const eid of this.graph.out.get(n.id) || []) {
        const e = this.graph.edges.get(eid);
        if (e && !depth.has(e.to)) { depth.set(e.to, d + 1); queue.push(this.graph.nodes.get(e.to)); }
      }
    }

    let i = 0;
    for (const n of this.graph.nodes.values()) {
      const deg = (this.graph.in.get(n.id)?.size || 0) + (this.graph.out.get(n.id)?.size || 0);
      if (deg === 0) continue;
      const d = depth.get(n.id) || 0;
      this.flashQueue.push({ nodeId: n.id, at: this.elapsed + d * 0.11 + i * 0.012 });
      i++;
      for (const eid of this.graph.out.get(n.id) || []) {
        const e = this.graph.edges.get(eid);
        if (e) e.signal = 1;
      }
    }
    this.bus.emit(EVT.TOAST, { msg:`✨ ${i} caja(s) conectada(s) iluminada(s)`, kind:'ok' });
  }

  /**
   * Avanza un fotograma; pasa sola a IDLE cuando no quedan pulsos.
   * @param {number} dt - Segundos (máx. 0.05).
   */
  update(dt) {
    // Evita saltos al volver de una pestaña inactiva.
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;

    const running = this.state === SimState.RUNNING;

    for (let i = this.fireTimers.length - 1; i >= 0; i--) {
      if (this.elapsed >= this.fireTimers[i].at) {
        const t = this.fireTimers[i];
        this.fireTimers.splice(i, 1);
        if (running) {
          const n = this.graph.nodes.get(t.nodeId);
          if (n) this._fire(n);
        }
      }
    }

    for (let i = this.flashQueue.length - 1; i >= 0; i--) {
      if (this.elapsed >= this.flashQueue[i].at) {
        const n = this.graph.nodes.get(this.flashQueue[i].nodeId);
        this.flashQueue.splice(i, 1);
        if (n) n.activation = 1;
      }
    }

    if (running) {
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const p = this.pulses[i];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          this._arrive(p);
          this.pulses.splice(i, 1);
          this.pool.release(p);
        }
      }
    }

    const kAct  = Math.pow(0.5, dt / CFG.ACTIVATION_HL);
    const kPot  = Math.pow(0.5, dt / CFG.POTENTIAL_HL);
    const kSig  = Math.pow(0.5, dt / CFG.SIGNAL_HL);

    for (const n of this.graph.nodes.values()) {
      if (n.activation > 0.001) {
        n.activation *= kAct;
        if (n.activation < 0.002) { n.activation = 0; n.state = 'idle'; }
      }
      if (n.potential > 0.0005) n.potential *= kPot; else n.potential = 0;
    }
    for (const e of this.graph.edges.values()) {
      if (e.signal > 0.001) e.signal *= kSig; else e.signal = 0;
    }

    if (running && this.pulses.length === 0 && this.fireTimers.length === 0) {
      this.state = SimState.IDLE;
      this.bus.emit(EVT.SIM_STATE, this.state);
      this.bus.emit(EVT.TOAST, {
        msg:`✔ Red estabilizada · ${this.stats.fires} disparos · ${this.stats.signals} señales`,
        kind:'ok'
      });
    }
  }

  /** Geometría cacheada; se recalcula cuando cambia `geometryVersion`. */
  _geo(edge) {
    if (edge._geo && edge._gv === this.graph.geometryVersion) return edge._geo;
    const a = this.graph.nodes.get(edge.from);
    const b = this.graph.nodes.get(edge.to);
    if (!a || !b) return { pts: new Float32Array(2), length: 1 };
    const geo = GEO.build(a, b, edge._geo ? edge._geo.pts : null);
    geo.length = GEO.approxLength(geo);
    edge._geo = geo;
    edge._gv  = this.graph.geometryVersion;
    return geo;
  }

  /**
   * @param {Object} edge
   * @returns {Object} Ver `GEO.build`.
   */
  geoFor(edge) { return this._geo(edge); }
}
