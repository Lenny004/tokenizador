// Datos de entrenamiento de la red (estación 6); copia exacta de "entrenamiento" en ejemplos.json.
// Se usa un módulo JS porque el navegador no importa JSON de forma fiable sin servidor especial.

/** @type {Array<{frase: string, respuesta: string}>} */
export const ENTRENAMIENTO = [
  { frase: "quiero pupusas de queso", respuesta: "con curtido y salsa <fin>" },
  { frase: "quiero", respuesta: "cafe pan <fin>" },
  { frase: "pupusas", respuesta: "revueltas chicharron <fin>" },
  { frase: "queso", respuesta: "frijol queso <fin>" },
  { frase: "por favor", respuesta: "listo <fin>" },
];
