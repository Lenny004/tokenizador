// Prueba de la estación 4: castigo progresivo por repetición.
// Cómo correrla (desde la carpeta del proyecto):
//   node pruebas/codificador.js

import { normalizar } from "../js/normalizar.js";
import { tokenizar } from "../js/tokenizador.js";
import { codificar } from "../js/codificador.js";

let fallos = 0;
function revisar(nombre, ok, detalle) {
  if (!ok) fallos++;
  console.log(`${ok ? "✔" : "✘"} ${nombre} · ${detalle}`);
}

const pesosDe = (frase, token) =>
  codificar(tokenizar(normalizar(frase))).filter((f) => f.token === token).map((f) => f.peso);

const de = pesosDe("quiero de queso de frijol de revuelta de", "de");
revisar("\"de\" se castiga cada vez más", JSON.stringify(de) === JSON.stringify([0.2, 0.1, 0.05, 0.025]), `[${de.join(", ")}]`);

const pupusas = pesosDe("pupusas pupusas pupusas", "pupusas");
revisar("palabra normal repetida", JSON.stringify(pupusas) === JSON.stringify([1, 0.5, 0.25]), `[${pupusas.join(", ")}]`);

const motivos = codificar(tokenizar("de de de")).map((f) => f.motivo);
revisar("el motivo dice cuántas veces se repitió", motivos[2] === "palabra vacía: preposición, repetida 2 veces", `"${motivos[2]}"`);

console.log(fallos === 0 ? "\nTodas las pruebas pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exitCode = fallos === 0 ? 0 : 1;
