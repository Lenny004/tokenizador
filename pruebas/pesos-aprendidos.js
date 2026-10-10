// Prueba: ¿para qué sirve castigar palabras vacías si su vector ya es [0, 0, 0]?
//
// Hoy "de" sale en ceros solo porque nuestra tabla de 3 preguntas es de juguete.
// Cuando la red aprenda los vectores sola, "de" va a tener números distintos de cero.
// Esta prueba simula ese día con vectores "aprendidos" (inventados para el ejemplo)
// y muestra que el codificador ya los castiga sin cambiar nada de su código.
//
// Cómo correrla (desde la carpeta del proyecto):
//   node pruebas/pesos-aprendidos.js

import { codificar } from "../js/codificador.js";

// Vectores "aprendidos": ninguno es cero.
const fichas = [
  { token: "de",      id: 5, vector: [0.3, -0.1, 0.4] },
  { token: "pupusas", id: 2, vector: [0.9, -0.8, 0.7] },
];

console.log("SIN castigo (todos pesan 1): 'de' empuja casi igual que 'pupusas'");
for (const f of fichas) console.log(`  ${f.token.padEnd(8)} ->`, f.vector);

console.log("\nCON castigo (codificador):");
for (const f of codificar(fichas)) {
  console.log(`  ${f.token.padEnd(8)} -> peso ${f.peso} (${f.motivo}) ->`, f.vectorPonderado);
}
