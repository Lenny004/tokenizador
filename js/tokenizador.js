// Estación 3: parte el texto en tokens y da a cada uno un vector de -1, 0 y +1.

// Preguntas por palabra: +1 = sí, -1 = no, 0 = no aplica.
export const RASGOS = ["caliente", "estado", "desayuno"];

/**
 * Vectores escritos a mano; las palabras ausentes salen en ceros.
 * @type {Object<string, Array<-1|0|1>>}
 */
const tabla = {
  quiero:  [ 0, +1,  0],
  pupusas: [+1, -1, +1],
  queso:   [ 0, -1, +1],
  frijol:  [ 0, -1, +1],
  de:      [ 0,  0,  0],
  y:       [ 0,  0,  0],
  por:     [ 0,  0,  0],
  favor:   [ 0,  0,  0],
};

// ID reservado para palabras fuera del vocabulario.
export const DESCONOCIDA = 0;
/**
 * Vocabulario: palabra -> ID desde 1. Se crea al importar y no cambia.
 * @type {Map<string, number>}
 */
const vocabulario = new Map(Object.keys(tabla).map((palabra, i) => [palabra, i + 1]));

/**
 * @param {string} token - Palabra normalizada.
 * @returns {number} Su ID, o `DESCONOCIDA`.
 */
export const idDe = (token) => vocabulario.get(token) ?? DESCONOCIDA;

/**
 * @typedef {Object} Ficha
 * @property {string} token
 * @property {number} id - 0 si es desconocida.
 * @property {Array<-1|0|1>} vector - Un valor por rasgo.
 */

/**
 * Devuelve una ficha por token.
 * @param {string} textoLimpio - Salida de `normalizar()`.
 * @returns {Array<Ficha>} `[]` si el texto está vacío.
 */
export function tokenizar(textoLimpio) {
  // "".split(" ") daría [""], una ficha falsa.
  if (!textoLimpio) return [];
  return textoLimpio.split(" ").map((token) => ({
    token,
    id: idDe(token),
    // Palabra sin rasgos conocidos: vector neutro.
    vector: tabla[token] ?? [0, 0, 0],
  }));
}
