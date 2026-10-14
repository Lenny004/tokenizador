// Tablero (index.html): pasa el texto por las estaciones y muestra cada resultado.
import { normalizar } from "./normalizar.js";
import { tokenizar } from "./tokenizador.js";
import { codificar } from "./codificador.js";
import { licuar, rasgoMasFuerte } from "./liquido.js";
import { crearRed, entrenar } from "./red.js";
import { construirBase, contestar } from "./vectores.js";
import { ENTRENAMIENTO, PREGUNTAS, RESPUESTAS } from "../data/ejemplos.js";

// Se lee #entrada; se escribe en el .resultado de cada estación.
const entrada = document.querySelector("#entrada");
const salidaNormalizar = document.querySelector("#normalizar .output");
const salidaTokens = document.querySelector("#tokenizador .output");
const salidaPesos = document.querySelector("#codificador .output");
const salidaLiquido = document.querySelector("#ternario-liquido .output");
const temperatura = document.querySelector("#temperatura");
const valorTemperatura = document.querySelector("#valor-temperatura");
const salidaTexto = document.querySelector("#prediccion .output--generated");
const salidaPasos = document.querySelector("#prediccion .output--steps");
const salidaBusqueda = document.querySelector("#prediccion .output--search");
const panelTexto = document.querySelector("#salida-texto .output");
const panelCodigo = document.querySelector("#salida-codigo .output__code");

// Estación 6: la red se entrena una sola vez al cargar (semilla fija, siempre igual).
const red = crearRed(7);
entrenar(red, ENTRENAMIENTO);
// Base vectorial: los vectores de las frases de ejemplo se calculan una vez.
const base = construirBase({ preguntas: PREGUNTAS, respuestas: RESPUESTAS });

/** Procesa `#entrada` por las estaciones 2 a 6 y repinta los resultados. */
function procesar() {
  // Estación 2: texto limpio.
  const limpio = normalizar(entrada.value);
  salidaNormalizar.textContent = limpio || "(vacío)";

  // Estación 3: una fila por ficha; replaceChildren borra el resultado anterior.
  const fichas = tokenizar(limpio);
  salidaTokens.replaceChildren();
  for (const f of fichas) {
    const fila = document.createElement("li");
    fila.textContent = `${f.token}  →  id ${f.id === 0 ? "0 (desconocida)" : f.id}  →  [${f.vector.join(", ")}]`;
    salidaTokens.appendChild(fila);
  }

  // Estación 4: peso y motivo por ficha.
  const codificadas = codificar(fichas);
  salidaPesos.replaceChildren();
  for (const f of codificadas) {
    const fila = document.createElement("li");
    fila.textContent = `${f.token} → ${f.peso} (${f.motivo})`;
    salidaPesos.appendChild(fila);
  }

  // Estación 5: vector mezclado, estado y rasgo más fuerte; innerText respeta los \n.
  const mezcla = licuar(codificadas);
  const fuerte = rasgoMasFuerte(mezcla.vector);
  salidaLiquido.innerText =
    `[${mezcla.vector.join(", ")}]\n` +
    `${mezcla.estado}: ${mezcla.nota}\n` +
    `Rasgo más fuerte: ${fuerte.rasgo} (${fuerte.valor})`;

  // Estación 6: primero la base vectorial; si no entiende, responde la red.
  const T = Number(temperatura.value);
  valorTemperatura.textContent = T.toFixed(1);
  const respuesta = contestar(base, red, entrada.value, mezcla, { temperatura: T });

  // Las 3 frases de ejemplo más parecidas, con su similitud.
  salidaBusqueda.replaceChildren();
  for (const c of respuesta.busqueda.coincidencias) {
    const fila = document.createElement("li");
    fila.textContent = `${(c.similitud * 100).toFixed(1)}% · ${c.intencion} · "${c.frase}"`;
    salidaBusqueda.appendChild(fila);
  }
  salidaTexto.textContent = respuesta.fuente === "vectores"
    ? `Base vectorial (${respuesta.busqueda.intencion}): ${respuesta.tipo === "codigo" ? "ver Código" : respuesta.texto}`
    : `Red neuronal: ${respuesta.texto}`;

  // Panel de salida: el texto o el código, según el tipo de respuesta.
  panelTexto.textContent = respuesta.tipo === "texto" ? respuesta.texto : "";
  panelCodigo.textContent = respuesta.tipo === "codigo" ? respuesta.texto : "";

  // Pasos de la red (vacío si respondió la base vectorial).
  salidaPasos.replaceChildren();
  for (const paso of respuesta.pasos) {
    const fila = document.createElement("li");
    fila.textContent = `${paso.token} · ` + paso.top3.map((o) => `${o.token} ${(o.probabilidad * 100).toFixed(1)}%`).join(", ");
    salidaPasos.appendChild(fila);
  }
}

// Al importar: registra los listeners y pinta el estado inicial.
entrada.addEventListener("input", procesar);
temperatura.addEventListener("input", procesar);
procesar();
