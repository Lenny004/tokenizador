// Estación 5: mezcla los vectores de la frase en uno (promedio ponderado por peso).

import { RASGOS } from "./tokenizador.js";

/**
 * Cambia NaN/Infinity por 0, recorta a [-1, 1] y redondea a 2 decimales.
 * @param {number} n
 * @returns {number}
 */
function limpiar(n) {
  // NaN o Infinity (p. ej. de una división rara) no deben llegar a la mezcla.
  if (!Number.isFinite(n)) return 0;
  // Los rasgos son ternarios: el resultado no puede salir de [-1, 1].
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
  // Entrada inválida (null, texto) se trata como frase vacía en vez de lanzar error.
  const fichas = Array.isArray(fichasCodificadas) ? fichasCodificadas : [];
  const ceros = RASGOS.map(() => 0);

  // Acumula la suma ponderada por rasgo y el peso total.
  let pesoTotal = 0;
  const suma = [...ceros];
  for (const ficha of fichas) {
    pesoTotal += ficha.peso;
    ficha.vectorPonderado.forEach((valor, i) => { suma[i] += valor; });
  }
  // Redondea para quitar ruido de coma flotante (4.499999 -> 4.5).
  pesoTotal = Math.round(pesoTotal * 100) / 100;

  // Evita dividir entre 0; `!(x > 0)` también atrapa NaN.
  if (fichas.length === 0 || !(pesoTotal > 0)) {
    return { vector: ceros, pesoTotal: 0, estado: "vacío", nota: "No hay palabras para licuar" };
  }

  // Promedio ponderado por rasgo, saneado con limpiar().
  const vector = suma.map((s) => limpiar(s / pesoTotal));

  // Todo en cero: solo había palabras vacías o desconocidas.
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
  // Empieza en 0 para que un vector todo en ceros devuelva "ninguno".
  let mejor = { rasgo: "ninguno", valor: 0 };
  vector.forEach((valor, i) => {
    // Compara por valor absoluto: -0.8 pesa más que 0.5; `>` estricto conserva el primero en empates.
    if (Math.abs(valor) > Math.abs(mejor.valor)) mejor = { rasgo: RASGOS[i], valor };
  });
  return mejor;
}
