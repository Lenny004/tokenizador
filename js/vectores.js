// Base de datos vectorial: encuentra la intención de una frase comparándola con frases de ejemplo.
import { normalizar } from "./normalizar.js";
import { tokenizar } from "./tokenizador.js";
import { codificar } from "./codificador.js";
import { predecir } from "./red.js";

export const UMBRAL = 0.4;
export const NO_ENTENDI = "No entendí la pregunta.";

/**
 * Vector disperso de una frase: palabra -> peso del codificador (bolsa de palabras).
 * Se usa en vez de los 3 rasgos porque con 3 números casi todas las frases se parecen.
 * @param {string} frase
 * @returns {Map<string, number>}
 */
export function vectorDisperso(frase) {
  const vector = new Map();
  // Suma los pesos: las palabras vacías (0.2) y cada repetición (×0.5) cuentan menos.
  for (const f of codificar(tokenizar(normalizar(frase)))) {
    vector.set(f.token, (vector.get(f.token) ?? 0) + f.peso);
  }
  return vector;
}

/**
 * Similitud coseno: producto punto dividido entre las longitudes de ambos vectores.
 * @param {Map<string, number>} a
 * @param {Map<string, number>} b
 * @returns {number} Entre 0 (nada en común) y 1 (mismas palabras en la misma proporción).
 */
export function coseno(a, b) {
  // Producto punto: solo suman las palabras que están en las dos frases.
  let punto = 0;
  for (const [palabra, peso] of a) punto += peso * (b.get(palabra) ?? 0);
  // Dividir entre las longitudes evita que las frases largas ganen solo por tener más palabras.
  const largo = (v) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const divisor = largo(a) * largo(b);
  return divisor > 0 ? punto / divisor : 0;
}

/**
 * @typedef {Object} Base
 * @property {Array<{intencion: string, frase: string, vector: Map<string, number>}>} indice
 * @property {Object<string, Array<{id: string, tipo: "texto"|"codigo", texto: string}>>} respuestas - Por intención.
 */

/**
 * Calcula el vector de cada frase de ejemplo una sola vez.
 * @param {{preguntas: Array<{intencion: string, frases: Array<string>}>, respuestas: Array<{intencion: string, id: string, tipo: string, texto: string}>}} datos
 * @returns {Base}
 */
export function construirBase({ preguntas, respuestas }) {
  const indice = preguntas.flatMap(({ intencion, frases }) =>
    frases.map((frase) => ({ intencion, frase, vector: vectorDisperso(frase) })));
  // Agrupa las respuestas por intención para encontrarlas rápido.
  const porIntencion = {};
  for (const { intencion, ...respuesta } of respuestas) {
    (porIntencion[intencion] ??= []).push(respuesta);
  }
  return { indice, respuestas: porIntencion };
}

/**
 * Las k frases de ejemplo más parecidas.
 * @param {Base} base
 * @param {string} frase
 * @param {number} [k=3]
 * @returns {Array<{intencion: string, frase: string, similitud: number}>} De mayor a menor similitud (3 decimales).
 */
export function buscar(base, frase, k = 3) {
  const consulta = vectorDisperso(frase);
  return base.indice
    .map(({ intencion, frase: ejemplo, vector }) => ({ intencion, frase: ejemplo, similitud: Math.round(coseno(consulta, vector) * 1000) / 1000 }))
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, k);
}

/**
 * @typedef {Object} Respuesta
 * @property {"ok"|"no entendí"} estado
 * @property {string|null} intencion
 * @property {number} confianza - Similitud de la mejor coincidencia.
 * @property {Array<{id: string, tipo: "texto"|"codigo", texto: string}>} respuestas
 * @property {Array<{intencion: string, frase: string, similitud: number}>} coincidencias - Top 3.
 */

/**
 * Responde con la intención más parecida si supera el umbral.
 * @param {Base} base
 * @param {string} frase
 * @param {{umbral?: number}} [opciones]
 * @returns {Respuesta}
 */
export function responder(base, frase, { umbral = UMBRAL } = {}) {
  const coincidencias = buscar(base, frase, 3);
  const mejor = coincidencias[0];
  // Bajo el umbral la frase no se parece lo suficiente a ningún ejemplo.
  if (!mejor || mejor.similitud < umbral) {
    return { estado: "no entendí", intencion: null, confianza: mejor?.similitud ?? 0, respuestas: [], coincidencias };
  }
  return { estado: "ok", intencion: mejor.intencion, confianza: mejor.similitud, respuestas: base.respuestas[mejor.intencion] ?? [], coincidencias };
}

/**
 * @typedef {Object} Contestacion
 * @property {"vectores"|"red"} fuente - Quién respondió.
 * @property {string} texto - Texto o código de la respuesta.
 * @property {"texto"|"codigo"} tipo
 * @property {Respuesta} busqueda - Resultado de la base vectorial.
 * @property {Array<Object>} pasos - Pasos de la red (vacío si respondió la base).
 */

/**
 * Usa la base vectorial si entiende la frase; si no, genera con la red neuronal.
 * @param {Base} base
 * @param {import("./red.js").Red} red
 * @param {string} frase - Texto original.
 * @param {{vector: Array<number>}} mezcla - Salida de `licuar()` para la red.
 * @param {{temperatura?: number, umbral?: number}} [opciones]
 * @returns {Contestacion}
 */
export function contestar(base, red, frase, mezcla, { temperatura = 0.7, umbral = UMBRAL } = {}) {
  const busqueda = responder(base, frase, { umbral });
  // Respuesta conocida: se usa la primera de su intención.
  if (busqueda.estado === "ok" && busqueda.respuestas.length > 0) {
    const [primera] = busqueda.respuestas;
    return { fuente: "vectores", texto: primera.texto, tipo: primera.tipo, busqueda, pasos: [] };
  }
  // Respaldo: la red genera palabra por palabra.
  const prediccion = predecir(red, mezcla, { temperatura });
  return { fuente: "red", texto: prediccion.texto || NO_ENTENDI, tipo: "texto", busqueda, pasos: prediccion.pasos };
}
