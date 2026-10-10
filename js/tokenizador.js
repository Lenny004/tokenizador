// Estación 3: tokenizador ternario.
// Parte el texto limpio en tokens (palabras) y convierte cada uno
// en un vector de -1, 0 y +1, respondiendo las "preguntas" de abajo.

// Las preguntas que le hacemos a cada palabra.
// +1 = sí, -1 = no, 0 = no aplica.
export const RASGOS = ["caliente", "estado", "desayuno"];

// Respuestas a mano para las palabras del ejemplo.
// Las que no estén en la tabla salen como puros ceros.
/**
 * Tabla de rasgos escrita a mano: palabra -> vector con una respuesta por cada pregunta de `RASGOS`.
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

// El diccionario (vocabulario): cada palabra conocida tiene un ID fijo,
// como el número de página de un diccionario. El ID 0 se reserva para
// palabras que no conocemos, igual que hacen los tokenizadores de verdad.
export const DESCONOCIDA = 0;
/**
 * Vocabulario a nivel de módulo: palabra -> ID (1, 2, 3... en el orden de `tabla`).
 * Se construye una sola vez al importar el módulo y nadie lo modifica después.
 * @type {Map<string, number>}
 */
const vocabulario = new Map(Object.keys(tabla).map((palabra, i) => [palabra, i + 1]));

/**
 * Devuelve el ID de un token en el vocabulario.
 *
 * @param {string} token - Palabra ya normalizada.
 * @returns {number} ID de la palabra, o `DESCONOCIDA` (0) si no está en el vocabulario.
 */
export const idDe = (token) => vocabulario.get(token) ?? DESCONOCIDA;

/**
 * @typedef {Object} Ficha
 * @property {string} token - La palabra.
 * @property {number} id - ID en el vocabulario (0 = desconocida).
 * @property {Array<-1|0|1>} vector - Una respuesta por cada pregunta de `RASGOS`; ceros si la palabra no está en la tabla.
 */

/**
 * Parte el texto limpio en tokens (separados por un espacio) y devuelve una ficha por token.
 *
 * @param {string} textoLimpio - Salida de `normalizar()` (espacios simples, sin extremos).
 * @returns {Array<Ficha>} Una ficha por token, en orden; `[]` si el texto está vacío.
 */
export function tokenizar(textoLimpio) {
  if (!textoLimpio) return [];
  return textoLimpio.split(" ").map((token) => ({
    token,
    id: idDe(token),
    vector: tabla[token] ?? [0, 0, 0],
  }));
}
