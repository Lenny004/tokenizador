// Prueba de la base de datos vectorial.
// Cómo correrla (desde la carpeta del proyecto):
//   node pruebas/vectores.js

import { readFileSync } from "node:fs";
import { construirBase, responder, contestar } from "../js/vectores.js";
import { crearRed, entrenar } from "../js/red.js";
import { licuar } from "../js/liquido.js";
import { codificar } from "../js/codificador.js";
import { tokenizar } from "../js/tokenizador.js";
import { normalizar } from "../js/normalizar.js";
import { ENTRENAMIENTO, PREGUNTAS, RESPUESTAS } from "../data/ejemplos.js";

let fallos = 0;
function revisar(nombre, ok, detalle) {
  if (!ok) fallos++;
  console.log(`${ok ? "✔" : "✘"} ${nombre} · ${detalle}`);
}

// ejemplos.js debe ser copia exacta de ejemplos.json.
const json = JSON.parse(readFileSync(new URL("../data/ejemplos.json", import.meta.url), "utf8"));
revisar("preguntas/respuestas iguales en json y js",
  JSON.stringify(json.preguntas) === JSON.stringify(PREGUNTAS) && JSON.stringify(json.respuestas) === JSON.stringify(RESPUESTAS),
  `${PREGUNTAS.length} intenciones, ${RESPUESTAS.length} respuestas`);

const base = construirBase({ preguntas: PREGUNTAS, respuestas: RESPUESTAS });

// Cada frase de ejemplo debe encontrar su propia intención.
for (const { intencion, frases } of PREGUNTAS) {
  const malas = frases.filter((f) => responder(base, f).intencion !== intencion);
  revisar(`frases de "${intencion}" se encuentran a sí mismas`, malas.length === 0, `${frases.length - malas.length}/${frases.length}`);
}

const nueva = responder(base, "hazme una página en html");
revisar("paráfrasis nueva -> html", nueva.intencion === "html", `confianza ${nueva.confianza}`);

const basura = responder(base, "asdf qwer zxcv");
revisar("texto sin sentido queda bajo el umbral", basura.estado === "no entendí", `confianza ${basura.confianza}`);

// Frase por defecto del tablero: antes la red respondía "(sin respuesta)".
const frase = "¡QUIERO   Pupusas de Queso, por favor!!";
const red = crearRed(7);
entrenar(red, ENTRENAMIENTO);
const mezcla = licuar(codificar(tokenizar(normalizar(frase))));
const r = contestar(base, red, frase, mezcla);
revisar("frase del tablero recibe respuesta real", r.fuente === "vectores" && r.texto.length > 0, `${r.busqueda.intencion} ${r.busqueda.confianza} -> "${r.texto}"`);

const respaldo = contestar(base, red, "quiero pupusas de queso zzz", licuar(codificar(tokenizar("quiero pupusas de queso"))), { umbral: 0.99 });
revisar("sin coincidencia usa la red", respaldo.fuente === "red" && respaldo.pasos.length > 0, `"${respaldo.texto}"`);

console.log(fallos === 0 ? "\nTodas las pruebas pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exitCode = fallos === 0 ? 0 : 1;
