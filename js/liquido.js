// Estación 5: ternario líquido.
// Objetivo: derretir TODOS los vectores de la frase en UNO solo,
// como licuar un curtido: entran repollo, zanahoria y chile por separado
// y sale una sola mezcla donde se siente un poco de cada cosa.
//
// La mezcla es un PROMEDIO PONDERADO: las palabras que pesan más
// (las que tienen significado) se sienten más en el sabor final.
//   vector = (suma de todos los vectorPonderado) / (suma de todos los pesos)

import { RASGOS } from "./tokenizador.js";

// Redondea a 2 decimales, cambia NaN o Infinity por 0 y evita que salga -0.
function limpiar(n) {
  if (!Number.isFinite(n)) return 0;
  const recortado = Math.min(1, Math.max(-1, n)); // nunca fuera de [-1, 1]
  return Math.round(recortado * 100) / 100 + 0;  // "+ 0" convierte -0 en 0
}

// Recibe las fichas del codificador y devuelve { vector, pesoTotal, estado, nota }.
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

// Dice qué rasgo "se siente más" en la mezcla (el de mayor valor absoluto).
// Ejemplo: [0.31, -0.31, 0.63] -> { rasgo: "desayuno", valor: 0.63 }
export function rasgoMasFuerte(vector) {
  let mejor = { rasgo: "ninguno", valor: 0 };
  vector.forEach((valor, i) => {
    if (Math.abs(valor) > Math.abs(mejor.valor)) mejor = { rasgo: RASGOS[i], valor };
  });
  return mejor;
}
