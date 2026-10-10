// Prueba de la estación 5 (ternario líquido).
// Pasa frases por toda la línea y revisa que la mezcla salga como esperamos.
//
// Cómo correrla (desde la carpeta del proyecto):
//   node pruebas/liquido.js

import { normalizar } from "../js/normalizar.js";
import { tokenizar } from "../js/tokenizador.js";
import { codificar } from "../js/codificador.js";
import { licuar, rasgoMasFuerte } from "../js/liquido.js";

const casos = [
  { frase: "quiero pupusas de queso", vector: [0.31, -0.31, 0.63], estado: "ok", rasgo: "desayuno" },
  { frase: "de y de",                 vector: [0, 0, 0],          estado: "sin significado" },
  { frase: "",                        vector: [0, 0, 0],          estado: "vacío" },
];

let fallos = 0;
for (const caso of casos) {
  const mezcla = licuar(codificar(tokenizar(normalizar(caso.frase))));
  const fuerte = rasgoMasFuerte(mezcla.vector);
  const ok =
    JSON.stringify(mezcla.vector) === JSON.stringify(caso.vector) &&
    mezcla.estado === caso.estado &&
    mezcla.vector.every(Number.isFinite) &&            // ningún NaN ni Infinity
    (!caso.rasgo || fuerte.rasgo === caso.rasgo);
  if (!ok) fallos++;
  console.log(`${ok ? "✔" : "✘"} "${caso.frase}" -> [${mezcla.vector.join(", ")}] · ${mezcla.estado} · ${mezcla.nota} · más fuerte: ${fuerte.rasgo} (${fuerte.valor})`);
}

console.log(fallos === 0 ? "\nTodas las pruebas pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exitCode = fallos === 0 ? 0 : 1;
