// Tablero (index.html): pasa el texto por las estaciones y muestra cada resultado.
import { normalizar } from "./normalizar.js";
import { tokenizar } from "./tokenizador.js";
import { codificar } from "./codificador.js";
import { licuar, rasgoMasFuerte } from "./liquido.js";

// Se lee #entrada; se escribe en el .resultado de cada estación.
const entrada = document.querySelector("#entrada");
const salidaNormalizar = document.querySelector("#normalizar .resultado");
const salidaTokens = document.querySelector("#tokenizador .resultado");
const salidaPesos = document.querySelector("#codificador .resultado");
const salidaLiquido = document.querySelector("#ternario-liquido .resultado");

/** Procesa `#entrada` por las estaciones 2 a 5 y repinta los resultados. */
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
}

// Al importar: registra el listener y pinta el estado inicial.
entrada.addEventListener("input", procesar);
procesar();
