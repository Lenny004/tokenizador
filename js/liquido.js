// Estación 5: mezcla los vectores de la frase en uno (promedio ponderado por peso).

import { RASGOS } from "./tokenizador.js";

/**
 * Cambia NaN/Infinity por 0, recorta a [-1, 1] y redondea a 2 decimales.
 * @param {number} n
 * @returns {number}
 */
function limpiar(n) {
  if (!Number.isFinite(n)) return 0;
  const recortado = Math.min(1, Math.max(-1, n));
  return Math.round(recortado * 100) / 100 + 0;  // "+ 0" convierte -0 en 0
}

/**
 * @typedef {Object} Mezcla
 * @property {Array<number>} vector - Un valor por rasgo.
 * @property {number} pesoTotal - Suma de los pesos.
 * @property {"ok"|"vacío"|"sin significado"} estado
 * @property {string} nota - Explicación corta del estado.
 */

/**
 * Promedio ponderado: suma de vectores ponderados / suma de pesos.
 * @param {Array<import("./codificador.js").FichaCodificada>} fichasCodificadas - Si no es arreglo, se trata como vacío.
 * @returns {Mezcla}
 */
export function licuar(fichasCodificadas) {
  const fichas = Array.isArray(fichasCodificadas) ? fichasCodificadas : [];
  const ceros = RASGOS.map(() => 0);

  let pesoTotal = 0;
  const suma = [...ceros];
  for (const ficha of fichas) {
    pesoTotal += ficha.peso;
    ficha.vectorPonderado.forEach((valor, i) => { suma[i] += valor; });
  }
  pesoTotal = Math.round(pesoTotal * 100) / 100;

  // Evita dividir entre 0.
  if (fichas.length === 0 || !(pesoTotal > 0)) {
    return { vector: ceros, pesoTotal: 0, estado: "vacío", nota: "No hay palabras para licuar" };
  }

  const vector = suma.map((s) => limpiar(s / pesoTotal));

  if (vector.every((v) => v === 0)) {
    return { vector, pesoTotal, estado: "sin significado", nota: "La frase solo tiene palabras vacías o desconocidas" };
  }
  return { vector, pesoTotal, estado: "ok", nota: "Mezcla lista" };
}

/**
 * Rasgo de mayor valor absoluto (el primero si hay empate).
 * @param {Array<number>} vector
 * @returns {{rasgo: string, valor: number}} `rasgo: "ninguno"` si todo es 0.
 */
export function rasgoMasFuerte(vector) {
  let mejor = { rasgo: "ninguno", valor: 0 };
  vector.forEach((valor, i) => {
    if (Math.abs(valor) > Math.abs(mejor.valor)) mejor = { rasgo: RASGOS[i], valor };
  });
  return mejor;
}
