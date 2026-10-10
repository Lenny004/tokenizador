import { CFG, EVT, uid } from './nucleo.js';

/* ==================================================================
   4 · NODE FACTORY  (patrón Factory + Strategy de render)
   ================================================================== */
export const NODE_TYPES = Object.freeze({
  trigger: { label:'Trigger',  color:'#4ade80', glow:'74,222,128',  threshold:0, icon:'⚡', desc:'Fuente / entrada' },
  neuron:  { label:'Neurona',  color:'#38bdf8', glow:'56,189,248',  threshold:1, icon:'🧠', desc:'Procesa 1 señal' },
  logic:   { label:'Lógica',   color:'#fbbf24', glow:'251,191,36',  threshold:2, icon:'⚙', desc:'Requiere 2 señales' },
  action:  { label:'Acción',   color:'#f472b6', glow:'244,114,182', threshold:1, icon:'▶', desc:'Salida / efecto' },
  memory:  { label:'Memoria',  color:'#a78bfa', glow:'167,139,250', threshold:1, icon:'💾', desc:'Persiste estado' },
  // --- Estaciones del tokenizador (la clave coincide con el registro de estaciones.js) ---
  texto:       { label:'Texto natural',          color:'#4ade80', glow:'74,222,128',  threshold:0, icon:'✍', desc:'Estación 1 · entrada' },
  normalizar:  { label:'Normalizar',             color:'#38bdf8', glow:'56,189,248',  threshold:1, icon:'🧹', desc:'Estación 2' },
  tokenizador: { label:'Tokenizador ternario',   color:'#22d3ee', glow:'34,211,238',  threshold:1, icon:'✂', desc:'Estación 3' },
  codificador: { label:'Codificador',            color:'#a78bfa', glow:'167,139,250', threshold:1, icon:'⚖', desc:'Estación 4' },
  liquido:     { label:'Ternario líquido',       color:'#2dd4bf', glow:'45,212,191',  threshold:1, icon:'🫗', desc:'Estación 5' },
  prediccion:  { label:'Predicción estocástica', color:'#64748b', glow:'100,116,139', threshold:1, icon:'⏳', desc:'Estación 6 · pendiente' },
  salida:      { label:'Salida',                 color:'#f472b6', glow:'244,114,182', threshold:1, icon:'📤', desc:'Resultado final' },
});

export class NodeFactory {
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
      // --- runtime state (no serializable) ---
      activation: 0,     // 0..1 brillo actual
      potential:  0,     // acumulador neuromórfico
      state:      'idle',
      // --- resultado real de la estación (se llena al disparar) ---
      salida:     undefined,
      pendiente:  false,
      error:      null,
      createdAt:  Date.now(),
    };
  }
  static preset(type) { return NODE_TYPES[type] || NODE_TYPES.neuron; }
}

/* ==================================================================
   5 · GRAPH MODEL  (estructura de datos + listas de adyacencia)
   ================================================================== */
export class GraphModel {
  constructor(bus) {
    this.bus = bus;
    this.nodes = new Map();   // id -> node
    this.edges = new Map();   // id -> edge
    this.out   = new Map();   // nodeId -> Set<edgeId>   (dendritas)
    this.in    = new Map();   // nodeId -> Set<edgeId>   (axones)
    this.geometryVersion = 0;
  }

  /* ---------- NODOS ---------- */
  addNode(node) {
    this.nodes.set(node.id, node);
    this.out.set(node.id, new Set());
    this.in.set(node.id, new Set());
    this._touch();
    this.bus.emit(EVT.NODE_ADDED, node);
    this.bus.emit(EVT.GRAPH_CHANGED, { reason: 'node:add', id: node.id });
    return node;
  }

  removeNode(id) {
    if (!this.nodes.has(id)) return false;
    // Elimina aristas huérfanas (evita redundancia / memory leaks)
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

  /* ---------- ARISTAS ---------- */
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

  /** Nodos raíz = sin entradas (fuentes de la señal). */
  roots() {
    const out = [];
    for (const [id, set] of this.in) if (set.size === 0) out.push(this.nodes.get(id));
    return out;
  }

  get nodeCount() { return this.nodes.size; }
  get edgeCount() { return this.edges.size; }

  clear() {
    for (const id of Array.from(this.edges.keys())) this.removeEdge(id);
    for (const id of Array.from(this.nodes.keys())) this.removeNode(id);
  }

  _touch() { this.geometryVersion++; }
}
