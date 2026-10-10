// Arma el simulador: crea las piezas y las conecta por el EventBus.
import { CFG, EVT, EventBus, clamp, now } from './nucleo.js';
import { NodeFactory, GraphModel } from './grafo.js';
import { SimState, SimulationEngine } from './motor.js';
import { Renderer } from './render.js';
import { Controller, Inspector, ToastManager } from './interfaz.js';
import { ejecutarEstacion } from './estaciones.js';

// Tipos genéricos que agrega el botón "Neurona" (no son estaciones).
const TIPOS_GENERICOS = ['neuron', 'logic', 'memory', 'action'];

/** Crea las piezas, arma la escena y arranca el bucle de dibujo (rAF). */
export class NeuroFlowApp {
  constructor() {
    this.bus = new EventBus();

    this.graph   = new GraphModel(this.bus);
    this.engine  = new SimulationEngine(this.graph, this.bus);
    this.camera  = { x: 0, y: 0, zoom: 1 };

    this.canvas   = document.getElementById('stage');
    this.renderer = new Renderer(this.canvas, this.graph, this.engine, this.camera, this.bus);
    this.controller = new Controller(this.canvas, this);

    this.toasts    = new ToastManager(document.getElementById('toasts'), this.bus);
    this.inspector = new Inspector(document.getElementById('inspector'), this);
    this.selection = null;

    this._fpsAcc = 0; this._fpsFrames = 0; this._fps = 60;
    this._hudAcc = 0;
    this._lastT = now();
    this._raf = 0;

    this._cacheDom();
    this._wireToolbar();
    this._wireKeyboard();
    this._wireResize();
    this._wireBusObservers();

    this._bootstrapScene();
    this.resize();
    this._loop();
  }

  _cacheDom() {
    this.dom = {
      play:   document.getElementById('btn-play'),
      pause:  document.getElementById('btn-pause'),
      stop:   document.getElementById('btn-stop'),
      add:    document.getElementById('btn-add'),
      illum:  document.getElementById('btn-illuminate'),
      fit:    document.getElementById('btn-fit'),
      grid:   document.getElementById('btn-grid'),
      state:  document.getElementById('stat-state'),
      nodes:  document.getElementById('stat-nodes'),
      edges:  document.getElementById('stat-edges'),
      pulses: document.getElementById('stat-pulses'),
      fps:    document.getElementById('stat-fps'),
      led:    document.getElementById('led-sim'),
      entrada: document.getElementById('entrada-sim'),
    };
  }

  /** Registra los botones de la barra. */
  _wireToolbar() {
    const d = this.dom;

    d.play.addEventListener('click', () => {
      if (this.engine.state === SimState.PAUSED) this.engine.resume();
      else this.engine.start();
    });
    d.pause.addEventListener('click', () => this.engine.pause());
    d.stop.addEventListener('click', () => this.engine.stop());

    d.add.addEventListener('click', () => {
      const cx = this.camera.x + (Math.random() - 0.5) * 120;
      const cy = this.camera.y + (Math.random() - 0.5) * 120;
      const type = TIPOS_GENERICOS[Math.floor(Math.random() * TIPOS_GENERICOS.length)];
      const n = this.graph.addNode(NodeFactory.create(type, cx - CFG.NODE_W/2, cy - CFG.NODE_H/2));
      n.activation = 1;
      this.select({ kind:'node', id: n.id });
    });

    d.illum.addEventListener('click', () => this.engine.illuminate());

    d.fit.addEventListener('click', () => this.fitView());

    d.grid.addEventListener('click', () => {
      this.renderer.showGrid = !this.renderer.showGrid;
      this.renderer._gridDirty = true;
      d.grid.style.opacity = this.renderer.showGrid ? '1' : '0.45';
    });
  }

  /** Atajos: Espacio, Supr/Retroceso, Esc y F (no actúan mientras se escribe). */
  _wireKeyboard() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.engine.state === SimState.RUNNING) this.engine.pause();
        else if (this.engine.state === SimState.PAUSED) this.engine.resume();
        else this.engine.start();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!this.selection) return;
        e.preventDefault();
        if (this.selection.kind === 'node') this.graph.removeNode(this.selection.id);
        else this.graph.removeEdge(this.selection.id);
        this.select(null);
      }
      if (e.key === 'Escape') this.select(null);
      if (e.key.toLowerCase() === 'f') this.fitView();
    });
  }

  /** Redimensiona 60 ms después del último cambio de tamaño. */
  _wireResize() {
    let t = 0;
    const doResize = () => { clearTimeout(t); t = setTimeout(() => this.resize(), 60); };
    window.addEventListener('resize', doResize);
    if (window.ResizeObserver) {
      new ResizeObserver(doResize).observe(this.canvas.parentElement);
    }
  }

  resize() {
    this.renderer.resize();
    this.renderer._gridDirty = true;
  }

  /** Suscripciones al EventBus que actualizan la UI y ejecutan estaciones. */
  _wireBusObservers() {
    this.bus.on(EVT.SIM_STATE, (state) => {
      const running = state === SimState.RUNNING;
      this.dom.play.classList.toggle('running', running);
      this.dom.play.querySelector('svg').innerHTML = running
        ? '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>'
        : '<polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none"/>';
      this.dom.play.childNodes[1].nodeValue = running ? ' Ejecutando' : ' Play';
      this.dom.pause.disabled = !running;
      this.dom.state.textContent = state;
      this.dom.led.classList.toggle('on', running);
    });

    this.bus.on(EVT.GRAPH_CHANGED, () => {
      this.dom.nodes.textContent = this.graph.nodeCount;
      this.dom.edges.textContent = this.graph.edgeCount;
    });

    // Al disparar, la caja procesa la salida de la anterior y avisa con NODE_OUTPUT.
    this.bus.on(EVT.SIM_FIRE, ({ nodeId }) => {
      const n = this.graph.nodes.get(nodeId);
      if (!n) return;
      const dato = this._datoDeEntrada(n);
      const { resultado, pendiente, error } = ejecutarEstacion(n.type, dato, this.dom.entrada.value);
      n.salida = resultado;
      n.pendiente = pendiente;
      n.error = error;
      this.bus.emit(EVT.NODE_OUTPUT, n);
    });

    // Si el grafo cambia mientras corre, se reinicia.
    this.bus.on(EVT.GRAPH_CHANGED, () => {
      if (this.engine.state === SimState.RUNNING) this.engine.reset();
    });
  }

  /**
   * Salida de la primera caja anterior que ya tenga resultado.
   * @param {Object} n
   * @returns {*} `undefined` si no hay.
   */
  _datoDeEntrada(n) {
    // Revisa las aristas de entrada; usa la primera caja anterior que ya produjo salida.
    for (const eid of this.graph.in.get(n.id) || []) {
      const anterior = this.graph.nodes.get(this.graph.edges.get(eid)?.from);
      if (anterior && anterior.salida !== undefined) return anterior.salida;
    }
    return undefined;
  }

  /**
   * Cambia la selección y emite `SELECTION`.
   * @param {{kind:'node'|'edge', id:string}|null} sel
   */
  select(sel) {
    this.selection = sel;
    this.bus.emit(EVT.SELECTION, sel);
  }

  /** Encuadra todas las cajas (zoom máx. 1.5). */
  fitView() {
    if (this.graph.nodeCount === 0) {
      this.camera.x = 0; this.camera.y = 0; this.camera.zoom = 1;
      this.bus.emit(EVT.CAMERA, this.camera);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.graph.nodes.values()) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 110;
    const w = (maxX - minX) + pad * 2;
    const h = (maxY - minY) + pad * 2;
    const z = clamp(Math.min(this.renderer.W / w, this.renderer.H / h), CFG.MIN_ZOOM, 1.5);

    this.camera.zoom = z;
    this.camera.x = (minX + maxX) / 2;
    this.camera.y = (minY + maxY) / 2;
    this.bus.emit(EVT.CAMERA, this.camera);
  }

  /** Crea las 6 estaciones y Salida en fila, conectadas en orden. */
  _bootstrapScene() {
    const orden = ['texto', 'normalizar', 'tokenizador', 'codificador', 'liquido', 'prediccion', 'salida'];
    const PASO_X = CFG.NODE_W + 80;
    let anterior = null;
    orden.forEach((tipo, i) => {
      const n = this.graph.addNode(NodeFactory.create(tipo, i * PASO_X - 900, -CFG.NODE_H / 2));
      if (anterior) this.graph.addEdge(anterior.id, n.id, 1);
      anterior = n;
    });

    this.dom.nodes.textContent = this.graph.nodeCount;
    this.dom.edges.textContent = this.graph.edgeCount;
  }

  /** Bucle principal: simula, dibuja y refresca contadores. */
  _loop() {
    const t = now();
    let dt = t - this._lastT;
    this._lastT = t;
    dt = Math.min(dt, 0.05);      // clamp anti-salto

    this.engine.update(dt);

    this.renderer.render(dt);

    // Contadores a ~6 Hz para no recargar cada fotograma.
    this._fpsAcc += dt; this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this._fps = this._fpsFrames / this._fpsAcc;
      this._fpsAcc = 0; this._fpsFrames = 0;
      this.dom.fps.textContent = Math.round(this._fps);
    }

    this._hudAcc += dt;
    if (this._hudAcc >= 0.15) {
      this._hudAcc = 0;
      this.dom.pulses.textContent = this.engine.pulses.length;
      this.dom.nodes.textContent  = this.graph.nodeCount;
      this.dom.edges.textContent  = this.graph.edgeCount;
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }

  hitTestNode(wx, wy) { return this.renderer.hitTestNode(wx, wy); }
}

