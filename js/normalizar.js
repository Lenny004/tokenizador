// Estación 2: normalizar.
// Objetivo: que lo que significa lo mismo se escriba igual.
// "¡QUIERO Pupusas!!" y "quiero pupusas" deben quedar idénticos.

// Letras del español que NO queremos perder al quitar tildes.
// - ñ: cambia el significado ("año" no es "ano", "caña" no es "cana").
// La ü NO se protege a propósito: "pingüino" y "pinguino" deben quedar iguales,
// porque es la misma palabra y en español ningún par de palabras se distingue solo por la ü.
// Cada letra se esconde en un carácter "invisible" (zona privada de Unicode)
// que una persona nunca escribe, así no se confunde con texto real.
const PROTEGIDAS = [
  { letra: "ñ", marca: "\uE000" },
];

export function normalizar(texto) {
  let t = texto
    .normalize("NFC")       // 0. Une letra + tilde en un solo carácter (algunos teclados, como el de Mac, las mandan separadas)
    .toLowerCase();         // 1. Todo a minúsculas: "QUIERO" -> "quiero", "Ñ" -> "ñ"

  for (const { letra, marca } of PROTEGIDAS) {
    t = t.replaceAll(letra, marca);           // 2. Escondo la ñ en la "caja fuerte"
  }

  t = t
    .normalize("NFD")                         // 3. Separa cada letra de su tilde: "á" -> "a" + "´"
    .replace(/[\u0300-\u036f]/g, "");         // 4. Borra tildes y diéresis: "está" -> "esta", "pingüino" -> "pinguino"

  for (const { letra, marca } of PROTEGIDAS) {
    t = t.replaceAll(marca, letra);           // 5. Saco la ñ de la caja fuerte
  }

  return t
    .replace(/[^a-zñ0-9\s]/g, " ")           // 6. Cambia signos (¿ ¡ , . « » emojis...) por espacios
    .replace(/\s+/g, " ")                     // 7. Varios espacios seguidos -> uno solo
    .trim();                                  // 8. Quita espacios al inicio y al final
}
