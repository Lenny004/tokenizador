// Prueba de la estación 6 (red neuronal).
// Cómo correrla (desde la carpeta del proyecto):
//   node pruebas/red.js

import { readFileSync } from "node:fs";
import { crearRed, entrenar, predecir, softmax, vectorDeFrase } from "../js/red.js";
import { ENTRENAMIENTO } from "../data/ejemplos.js";

let fallos = 0;
function revisar(nombre, ok, detalle) {
  if (!ok) fallos++;
  console.log(`${ok ? "✔" : "✘"} ${nombre} · ${detalle}`);
}

// ejemplos.js debe ser copia exacta de "entrenamiento" en ejemplos.json.
const json = JSON.parse(readFileSync(new URL("../data/ejemplos.json", import.meta.url), "utf8"));
revisar("ejemplos.js y ejemplos.json iguales", JSON.stringify(json.entrenamiento) === JSON.stringify(ENTRENAMIENTO), `${ENTRENAMIENTO.length} pares`);

const p = softmax([2, 1, 0.1]);
const suma = p.reduce((s, x) => s + x, 0);
revisar("softmax suma 1", Math.abs(suma - 1) < 1e-9, `suma = ${suma}`);

const frio = softmax([2, 1, 0.1], 0.1);
revisar("temperatura baja concentra", frio[0] > 0.95, `top a T=0.1 = ${frio[0].toFixed(4)}`);

const red = crearRed(7);
const historial = entrenar(red, ENTRENAMIENTO);
revisar("la pérdida baja", historial.at(-1) < historial[0] / 5, `${historial[0].toFixed(3)} -> ${historial.at(-1).toFixed(3)}`);

const pred = predecir(red, vectorDeFrase("quiero pupusas de queso"), { temperatura: 0.1 });
revisar("predicción entrenada", pred.texto === "con curtido y salsa", `"${pred.texto}" · probs ${pred.pasos.map((s) => s.probabilidad).join(" ")}`);

const repetida = predecir(red, vectorDeFrase("quiero pupusas de queso"), { temperatura: 0.1 });
revisar("determinista con semilla", JSON.stringify(repetida) === JSON.stringify(pred), "misma salida dos veces");

console.log(fallos === 0 ? "\nTodas las pruebas pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exitCode = fallos === 0 ? 0 : 1;
