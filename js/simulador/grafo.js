import { CFG, EVT, uid } from './nucleo.js';

/** Tipos de caja; `glow` es "r,g,b" para rgba(). */
export const NODE_TYPES = Object.freeze({
  trigger: { label:'Trigger',  color:'#4ade80', glow:'74,222,128',  threshold:0, icon:'⚡', desc:'Fuente / entrada' },
  neuron:  { label:'Neurona',  color:'#38bdf8', glow:'56,189,248',  threshold:1, icon:'🧠', desc:'Procesa 1 señal' },
  logic:   { label:'Lógica',   color:'#fbbf24', glow:'251,191,36',  threshold:2, icon:'⚙', desc:'Requiere 2 señales' },
  action:  { label:'Acción',   color:'#f472b6', glow:'244,114,182', threshold:1, icon:'▶', desc:'Salida / efecto' },
  memory:  { label:'Memoria',  color:'#a78bfa', glow:'167,139,250', threshold:1, icon:'💾', desc:'Persiste estado' },
  // Estaciones: las claves coinciden con ESTACIONES (estaciones.js).
  texto:       { label:'Texto natural',          color:'#4ade80', glow:'74,222,128',  threshold:0, icon:'✍', desc:'Estación 1 · entrada' },
  normalizar:  { label:'Normalizar',             color:'#38bdf8', glow:'56,189,248',  threshold:1, icon:'🧹', desc:'Estación 2' },
  tokenizador: { label:'Tokenizador ternario',   color:'#22d3ee', glow:'34,211,238',  threshold:1, icon:'✂', desc:'Estación 3' },
  codificador: { label:'Codificador',            color:'#a78bfa', glow:'167,139,250', threshold:1, icon:'⚖', desc:'Estación 4' },
  liquido:     { label:'Ternario líquido',       color:'#2dd4bf', glow:'45,212,191',  threshold:1, icon:'🫗', desc:'Estación 5' },
  prediccion:  { label:'Predicción estocástica', color:'#64748b', glow:'100,116,139', threshold:1, icon:'⏳', desc:'Estación 6 · en desarrollo' },
  salida:      { label:'Salida',                 color:'#f472b6', glow:'244,114,182', threshold:1, icon:'📤', desc:'Resultado final' },
});

export class NodeFactory {
  /**
   * Crea un nodo sin agregarlo al grafo.
   * @param {string} type - Clave de `NODE_TYPES` (por defecto `neuron`).
   * @param {number} x
   * @param {number} y - Esquina superior izquierda (px de mundo).
   * @param {{label?: string, threshold?: number, weight?: number}} [overrides]
   * @returns {Object}
   */
  static create(type, x, y, overrides = {}) {
    const preset = NODE_TYPES[type] || NODE_TYPES.neuron;
    const id     = uid('N');
    return {
      id,
      eventId:   uid('EVT'),          // ← ID único de evento (inmutable)
      type,
      label:     overrides.label ?? preset.label,
      color:     preset.color,
      glow:      preset.glow,
      icon:      preset.icon,
      x, y,
      w: CFG.NODE_W,
      h: CFG.NODE_H,
      threshold: overrides.threshold ?? preset.threshold,
      weight:    overrides.weight ?? 1,
      // Estado de ejecución.
      activation: 0,     // 0..1 brillo actual
      potential:  0,     // acumulador neuromórfico
      state:      'idle',
      // Resultado de la estación (se llena al disparar).
      salida:     undefined,
      pendiente:  false,
      error:      null,
      createdAt:  Date.now(),
    };
  }
  /**
   * @param {string} type
   * @returns {Object} Datos del tipo (o de `neuron`).
   */
  static preset(type) { return NODE_TYPES[type] || NODE_TYPES.neuron; }
}

/**
 * Nodos, aristas y adyacencias; emite eventos en cada cambio.
 * @param {EventBus} bus
 */
export class GraphModel {
  constructor(bus) {
    this.bus = bus;
    this.nodes = new Map();   // id -> node
    this.edges = new Map();   // id -> edge
    this.out   = new Map();   // nodeId -> Set<edgeId>   (dendritas)
    this.in    = new Map();   // nodeId -> Set<edgeId>   (axones)
    this.geometryVersion = 0;
  }

  /**
   * Agrega el nodo y emite `NODE_ADDED` y `GRAPH_CHANGED`.
   * @param {Object} node
   * @returns {Object}
   */
  addNode(node) {
    this.nodes.set(node.id, node);
    this.out.set(node.id, new Set());
    this.in.set(node.id, new Set());
    this._touch();
    this.bus.emit(EVT.NODE_ADDED, node);
    this.bus.emit(EVT.GRAPH_CHANGED, { reason: 'node:add', id: node.id });
    return node;
  }

  /**
   * Elimina el nodo y sus aristas; emite `NODE_REMOVED` y `GRAPH_CHANGED`.
   * @param {string} id
   * @returns {boolean} `false` si el nodo no existía.
   */
  removeNode(id) {
    if (!this.nodes.has(id)) return false;
    // Quita también sus aristas para no dejarlas huérfanas.
    for (const eid of Array.from(this.out.get(id))) this.removeEdge(eid);
    for (const eid of Array.from(this.in.get(id)))  this.removeEdge(eid);
    const node = this.nodes.get(id);
    this.nodes.delete(id);
    this.out.delete(id);
    this.in.delete(id);
    this._touch();
    this.bus.emit(EVT.NODE_REMOVED, node);
    this.bus.emit(EVT.GRAPH_CHANGED, { reason: 'node:remove', id });
    return true;
  }

  /**
   * Conecta dos nodos y emite `EDGE_ADDED` y `GRAPH_CHANGED`.
   * @param {string} fromId
   * @param {string} toId
   * @param {number} [weight=1] - Potencial que suma cada pulso.
   * @returns {Object|null} `null` si es auto-lazo, duplicada o falta un nodo.
   */
  addEdge(fromId, toId, weight = 1) {
    if (fromId === toId) return null;                  // sin auto-lazos
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    if (this.hasEdge(fromId, toId)) return null;       // sin duplicados
    const edge = {
      id: uid('E'),
      from: fromId,
      to: toId,
      weight,
      signal: 0,          // 0..1 brillo de la conexión
      flow: 0,            // progreso de la última señal
      _geo: null,
      _gv: -1,
    };
    this.edges.set(edge.id, edge);
    this.out.get(fromId).add(edge.id);
    this.in.get(toId).add(edge.id);
    this._touch();
    this.bus.emit(EVT.EDGE_ADDED, edge);
    this.bus.emit(EVT.GRAPH_CHANGED, { reason: 'edge:add', id: edge.id });
    return edge;
  }

  /**
   * Elimina la arista y emite `EDGE_REMOVED` y `GRAPH_CHANGED`.
   * @param {string} id
   * @returns {boolean} `false` si no existía.
   */
  removeEdge(id) {
    const edge = this.edges.get(id);
    if (!edge) return false;
    this.edges.delete(id);
    this.out.get(edge.from)?.delete(id);
    this.in.get(edge.to)?.delete(id);
    this._touch();
    this.bus.emit(EVT.EDGE_REMOVED, edge);
    this.bus.emit(EVT.GRAPH_CHANGED, { reason: 'edge:remove', id });
    return true;
  }

  hasEdge(fromId, toId) {
    const set = this.out.get(fromId);
    if (!set) return false;
    for (const eid of set) if (this.edges.get(eid)?.to === toId) return true;
    return false;
  }

  /** Nodos sin entradas. */
  roots() {
    const out = [];
    for (const [id, set] of this.in) if (set.size === 0) out.push(this.nodes.get(id));
    return out;
  }

  get nodeCount() { return this.nodes.size; }
  get edgeCount() { return this.edges.size; }

  /** Elimina todo, emitiendo los eventos de cada elemento. */
  clear() {
    for (const id of Array.from(this.edges.keys())) this.removeEdge(id);
    for (const id of Array.from(this.nodes.keys())) this.removeNode(id);
  }

  _touch() { this.geometryVersion++; }
}
