// Estación 5: ternario líquido.
// Objetivo: derretir TODOS los vectores de la frase en UNO solo,
// como licuar un curtido: entran repollo, zanahoria y chile por separado
// y sale una sola mezcla donde se siente un poco de cada cosa.
//
// La mezcla es un PROMEDIO PONDERADO: las palabras que pesan más
// (las que tienen significado) se sienten más en el sabor final.
//   vector = (suma de todos los vectorPonderado) / (suma de todos los pesos)

import { RASGOS } from "./tokenizador.js";

/**
 * Limpia un valor de la mezcla: cambia NaN o Infinity por 0, lo recorta a [-1, 1],
 * lo redondea a 2 decimales y evita que salga -0.
 *
 * @param {number} n - Valor a limpiar.
 * @returns {number} Valor finito entre -1 y 1.
 */
function limpiar(n) {
  if (!Number.isFinite(n)) return 0;
  const recortado = Math.min(1, Math.max(-1, n)); // nunca fuera de [-1, 1]
  return Math.round(recortado * 100) / 100 + 0;  // "+ 0" convierte -0 en 0
}

/**
 * @typedef {Object} Mezcla
 * @property {Array<number>} vector - Promedio ponderado, un valor por rasgo de `RASGOS`.
 * @property {number} pesoTotal - Suma de los pesos (2 decimales); 0 si el estado es "vacío".
 * @property {"ok"|"vacío"|"sin significado"} estado
 * @property {string} nota - Explicación corta del estado.
 */

/**
 * Licúa las fichas del codificador en un solo vector (promedio ponderado).
 * Si recibe algo que no es un arreglo, lo trata como una lista vacía.
 *
 * @param {Array<import("./codificador.js").FichaCodificada>} fichasCodificadas - Salida de `codificar()`.
 * @returns {Mezcla} Estado "vacío" sin fichas o con peso total 0; "sin significado" si el vector queda en ceros; "ok" en otro caso.
 */
export function licuar(fichasCodificadas) {
  const fichas = Array.isArray(fichasCodificadas) ? fichasCodificadas : [];
  const ceros = RASGOS.map(() => 0);

  // 1. Sumamos los pesos y, rasgo por rasgo, los vectores ya ponderados.
  let pesoTotal = 0;
  const suma = [...ceros];
  for (const ficha of fichas) {
    pesoTotal += ficha.peso;
    ficha.vectorPonderado.forEach((valor, i) => { suma[i] += valor; });
  }
  pesoTotal = Math.round(pesoTotal * 100) / 100;

  // 2. Sin palabras (o todas con peso 0) no hay nada que licuar.
  if (fichas.length === 0 || !(pesoTotal > 0)) {
    return { vector: ceros, pesoTotal: 0, estado: "vacío", nota: "No hay palabras para licuar" };
  }

  // 3. Dividimos entre el peso total: eso es el promedio ponderado.
  const vector = suma.map((s) => limpiar(s / pesoTotal));

  // 4. Si todo quedó en cero, la frase no aportó significado.
  if (vector.every((v) => v === 0)) {
    return { vector, pesoTotal, estado: "sin significado", nota: "La frase solo tiene palabras vacías o desconocidas" };
  }
  return { vector, pesoTotal, estado: "ok", nota: "Mezcla lista" };
}

/**
 * Dice qué rasgo "se siente más" en la mezcla (el de mayor valor absoluto).
 * Ante un empate se queda con el primero.
 *
 * @param {Array<number>} vector - Vector con un valor por rasgo de `RASGOS`.
 * @returns {{rasgo: string, valor: number}} Por ejemplo `{ rasgo: "desayuno", valor: 0.63 }`; `{ rasgo: "ninguno", valor: 0 }` si todo es cero.
 */
export function rasgoMasFuerte(vector) {
  let mejor = { rasgo: "ninguno", valor: 0 };
  vector.forEach((valor, i) => {
    if (Math.abs(valor) > Math.abs(mejor.valor)) mejor = { rasgo: RASGOS[i], valor };
  });
  return mejor;
}
