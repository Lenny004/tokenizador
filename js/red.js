// Estación 6: red neuronal mínima (una capa lineal + softmax) que genera la respuesta token a token.
import { normalizar } from "./normalizar.js";
import { tokenizar, RASGOS } from "./tokenizador.js";
import { codificar } from "./codificador.js";
import { licuar } from "./liquido.js";

/**
 * Vocabulario de salida: cada palabra con su vector (caliente, estado, desayuno) para realimentar la red.
 * @type {Object<string, Array<-1|0|1>>}
 */
export const VOCAB_SALIDA = {
  "con":        [ 0,  1,  1],
  "curtido":    [-1, -1,  0],
  "y":          [ 0,  0, -1],
  "salsa":      [-1,  1,  0],
  "queso":      [ 0, -1,  1],
  "frijol":     [ 1, -1,  0],
  "revueltas":  [ 1, -1, -1],
  "chicharron": [ 1,  0,  1],
  "cafe":       [ 1,  1,  1],
  "pan":        [ 0, -1, -1],
  "listo":      [-1,  0, -1],
  "<fin>":      [-1, -1, -1],
};
export const PALABRAS = Object.keys(VOCAB_SALIDA);
const FIN = "<fin>";
const N_ENTRADAS = RASGOS.length * 2; // vector de la frase + vector del token anterior

/**
 * Generador pseudoaleatorio mulberry32: con la misma semilla da siempre la misma secuencia.
 * @param {number} semilla
 * @returns {function(): number} Devuelve números en [0, 1).
 */
export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    // Mezcla de bits estándar de mulberry32; ">>> 0" mantiene enteros sin signo de 32 bits.
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @typedef {Object} Red
 * @property {Array<Array<number>>} W - Pesos: una fila por palabra de salida, una columna por entrada.
 * @property {Array<number>} b - Sesgo por palabra de salida.
 */

/**
 * Crea una red con pesos pequeños aleatorios (reproducibles por la semilla).
 * @param {number} [semilla=7]
 * @returns {Red}
 */
export function crearRed(semilla = 7) {
  const azar = mulberry32(semilla);
  // Valores en [-0.1, 0.1): pequeños para que al inicio ninguna palabra domine.
  const W = PALABRAS.map(() => Array.from({ length: N_ENTRADAS }, () => (azar() - 0.5) * 0.2));
  const b = PALABRAS.map(() => 0);
  return { W, b };
}

/**
 * Convierte puntajes (logits) en probabilidades que suman 1.
 * @param {Array<number>} logits
 * @param {number} [temperatura=1] - Menor que 1 concentra la probabilidad; mayor que 1 la reparte.
 * @returns {Array<number>}
 */
export function softmax(logits, temperatura = 1) {
  // Temperatura mínima para no dividir entre 0.
  const T = Math.max(temperatura, 1e-6);
  const escalados = logits.map((z) => z / T);
  // Restar el máximo evita que Math.exp desborde a Infinity; el resultado no cambia.
  const max = Math.max(...escalados);
  const exps = escalados.map((z) => Math.exp(z - max));
  const suma = exps.reduce((s, e) => s + e, 0);
  return exps.map((e) => e / suma);
}

/**
 * Elige un índice al azar respetando las probabilidades (suma acumulada).
 * @param {Array<number>} probabilidades - Deben sumar 1.
 * @param {number} azar - Número en [0, 1).
 * @returns {number} Índice elegido.
 */
export function muestrear(probabilidades, azar) {
  // Cada opción ocupa un tramo de [0, 1) del tamaño de su probabilidad.
  let acumulado = 0;
  for (let i = 0; i < probabilidades.length; i++) {
    acumulado += probabilidades[i];
    if (azar < acumulado) return i;
  }
  // Por redondeo la suma puede quedar en 0.9999...: se devuelve el último.
  return probabilidades.length - 1;
}

/**
 * Puntaje de cada palabra: W·x + b.
 * @param {Red} red
 * @param {Array<number>} x - 6 entradas.
 * @returns {Array<number>}
 */
function calcularLogits(red, x) {
  return red.W.map((fila, k) => fila.reduce((s, w, j) => s + w * x[j], red.b[k]));
}

/**
 * Pasa una frase por las estaciones 2 a 5 y devuelve su vector mezclado.
 * @param {string} frase
 * @returns {Array<number>}
 */
export function vectorDeFrase(frase) {
  return licuar(codificar(tokenizar(normalizar(frase)))).vector;
}

/**
 * Convierte pares frase -> respuesta en ejemplos de un paso: entrada x y palabra objetivo.
 * @param {Array<{frase: string, respuesta: string}>} pares
 * @returns {Array<{x: Array<number>, objetivo: number}>}
 */
export function prepararEjemplos(pares) {
  const ejemplos = [];
  for (const { frase, respuesta } of pares) {
    const vFrase = vectorDeFrase(frase);
    // El primer paso no tiene token anterior: se usan ceros.
    let anterior = RASGOS.map(() => 0);
    for (const palabra of respuesta.split(" ")) {
      const objetivo = PALABRAS.indexOf(palabra);
      if (objetivo === -1) throw new Error(`"${palabra}" no está en el vocabulario de salida`);
      ejemplos.push({ x: [...vFrase, ...anterior], objetivo });
      anterior = VOCAB_SALIDA[palabra];
    }
  }
  return ejemplos;
}

/**
 * Entrena la red con descenso de gradiente sobre la entropía cruzada.
 * @param {Red} red - Se modifica en el lugar.
 * @param {Array<{frase: string, respuesta: string}>} pares
 * @param {{epocas?: number, tasa?: number}} [opciones]
 * @returns {Array<number>} Pérdida promedio por época.
 */
export function entrenar(red, pares, { epocas = 600, tasa = 0.5 } = {}) {
  const ejemplos = prepararEjemplos(pares);
  const historial = [];
  for (let e = 0; e < epocas; e++) {
    let perdida = 0;
    for (const { x, objetivo } of ejemplos) {
      const p = softmax(calcularLogits(red, x));
      // Entropía cruzada: castiga poca probabilidad en la palabra correcta (1e-12 evita log(0)).
      perdida += -Math.log(p[objetivo] + 1e-12);
      // Gradiente de softmax + entropía cruzada: (p - onehot); se resta multiplicado por x.
      for (let k = 0; k < p.length; k++) {
        const error = p[k] - (k === objetivo ? 1 : 0);
        for (let j = 0; j < x.length; j++) red.W[k][j] -= tasa * error * x[j];
        red.b[k] -= tasa * error;
      }
    }
    historial.push(perdida / ejemplos.length);
  }
  return historial;
}

/**
 * @typedef {Object} Prediccion
 * @property {Array<string>} tokens - Incluye "<fin>" si se alcanzó.
 * @property {Array<{token: string, probabilidad: number, top3: Array<{token: string, probabilidad: number}>}>} pasos
 * @property {string} texto - Tokens sin "<fin>", separados por espacio.
 */

/**
 * Genera la respuesta palabra por palabra hasta "<fin>" o `maxTokens`.
 * @param {Red} red
 * @param {{vector: Array<number>}|Array<number>} mezcla - Salida de `licuar()` o su vector.
 * @param {{temperatura?: number, maxTokens?: number, semilla?: number}} [opciones]
 * @returns {Prediccion}
 */
export function predecir(red, mezcla, { temperatura = 0.7, maxTokens = 8, semilla = 1 } = {}) {
  const vFrase = Array.isArray(mezcla) ? mezcla : (mezcla?.vector ?? RASGOS.map(() => 0));
  // Azar con semilla fija: la misma frase y temperatura dan siempre la misma respuesta.
  const azar = mulberry32(semilla);
  let anterior = RASGOS.map(() => 0);
  const tokens = [];
  const pasos = [];
  while (tokens.length < maxTokens) {
    const p = softmax(calcularLogits(red, [...vFrase, ...anterior]), temperatura);
    const i = muestrear(p, azar());
    // Las 3 palabras más probables, para mostrar en qué dudó la red.
    const top3 = p.map((probabilidad, k) => ({ token: PALABRAS[k], probabilidad: redondear(probabilidad) }))
      .sort((a, c) => c.probabilidad - a.probabilidad)
      .slice(0, 3);
    tokens.push(PALABRAS[i]);
    pasos.push({ token: PALABRAS[i], probabilidad: redondear(p[i]), top3 });
    if (PALABRAS[i] === FIN) break;
    // Realimentación: el token elegido es parte de la entrada del siguiente paso.
    anterior = VOCAB_SALIDA[PALABRAS[i]];
  }
  return { tokens, pasos, texto: tokens.filter((t) => t !== FIN).join(" ") };
}

/**
 * Redondea a 3 decimales.
 * @param {number} n
 * @returns {number}
 */
function redondear(n) {
  return Math.round(n * 1000) / 1000;
}
