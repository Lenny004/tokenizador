// Punto de entrada de simulador.html: arranca el simulador visual.
// (Como es un módulo, el navegador lo ejecuta cuando la página ya cargó.)
import { NeuroFlowApp } from './simulador/app.js';

const app = new NeuroFlowApp();
window.__NEUROFLOW__ = app;          // para curiosear desde la consola del navegador
setTimeout(() => app.fitView(), 80); // encuadra las 7 cajas al iniciar
