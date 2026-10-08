// Estación 2: normalizar.
// Objetivo: que lo que significa lo mismo se escriba igual.
// "¡QUIERO Pupusas!!" y "quiero pupusas" deben quedar idénticos.

export function normalizar(texto) {
  return texto
    .toLowerCase()                                      // 1. Todo a minúsculas: "QUIERO" -> "quiero"
    .normalize("NFD")                                   // 2. Separa la letra de su tilde: "á" -> "a" + "´"
    .replace(/[\u0300-\u036f]/g, "")                    // 3. Borra las tildes sueltas: "está" -> "esta"
    .replace(/[^a-zñ0-9\s]/g, " ")                      // 4. Cambia signos por espacios: "¡hola!" -> " hola "
    .replace(/\s+/g, " ")                               // 5. Varios espacios seguidos -> uno solo
    .trim();                                            // 6. Quita espacios al inicio y al final
}

// Ojo: el paso 3 también convierte "ñ" en "n", porque la ñ es una "n" con tilde.
// Si queremos conservar la ñ, lo arreglamos en una próxima clase.
