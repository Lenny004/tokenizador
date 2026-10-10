// Estación 2: normaliza el texto para que variantes de una misma frase queden iguales.

// La ñ se protege porque cambia el significado ("año" ≠ "ano"); la ü no, porque ninguna
// palabra se distingue solo por ella. La marca es un carácter de uso privado de Unicode.
const PROTEGIDAS = [
  { letra: "ñ", marca: "\uE000" },
];

/**
 * Pasa a minúsculas, quita tildes y signos y junta espacios, conservando la ñ.
 * @param {string} texto - Texto original.
 * @returns {string} Solo `a-z`, `ñ`, dígitos y espacios simples.
 */
export function normalizar(texto) {
  let t = texto
    .normalize("NFC")       // algunos teclados (Mac) mandan letra y tilde separadas
    .toLowerCase();

  // Esconde la ñ antes de NFD, que la partiría en n + tilde.
  for (const { letra, marca } of PROTEGIDAS) {
    t = t.replaceAll(letra, marca);
  }

  t = t
    // Separa tildes de las letras y las borra; la ñ ya está a salvo.
    .normalize("NFD")                         // separa cada letra de su tilde
    .replace(/[\u0300-\u036f]/g, "");         // borra tildes y diéresis

  // Devuelve la ñ a su lugar.
  for (const { letra, marca } of PROTEGIDAS) {
    t = t.replaceAll(marca, letra);
  }

  // Deja solo letras, dígitos y espacios simples.
  return t
    .replace(/[^a-zñ0-9\s]/g, " ")           // signos y emojis -> espacio
    .replace(/\s+/g, " ")
    .trim();
}
