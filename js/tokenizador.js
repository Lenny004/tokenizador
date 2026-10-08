// Estación 3: tokenizador ternario.
// Parte el texto limpio en tokens (palabras) y convierte cada uno
// en un vector de -1, 0 y +1, respondiendo las "preguntas" de abajo.

// Las preguntas que le hacemos a cada palabra.
// +1 = sí, -1 = no, 0 = no aplica.
export const RASGOS = ["caliente", "estado", "desayuno"];

// Respuestas a mano para las palabras del ejemplo.
// Las que no estén en la tabla salen como puros ceros.
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
const vocabulario = new Map(Object.keys(tabla).map((palabra, i) => [palabra, i + 1]));

export const idDe = (token) => vocabulario.get(token) ?? DESCONOCIDA;

// Devuelve una ficha por token: { token, id, vector }.
export function tokenizar(textoLimpio) {
  if (!textoLimpio) return [];
  return textoLimpio.split(" ").map((token) => ({
    token,
    id: idDe(token),
    vector: tabla[token] ?? [0, 0, 0],
  }));
}
