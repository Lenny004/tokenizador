// Punto de entrada de simulador.html.
import { NeuroFlowApp } from './simulador/app.js';

const app = new NeuroFlowApp();
window.__NEUROFLOW__ = app;          // acceso desde la consola
setTimeout(() => app.fitView(), 80); // espera al primer resize (ms)
