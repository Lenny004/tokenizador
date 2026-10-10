// El "director": toma el texto y lo pasa de estación en estación.
import { normalizar } from "./normalizar.js";
import { tokenizar } from "./tokenizador.js";
import { codificar } from "./codificador.js";
import { licuar, rasgoMasFuerte } from "./liquido.js";

const entrada = document.querySelector("#entrada");
const salidaNormalizar = document.querySelector("#normalizar .resultado");
const salidaTokens = document.querySelector("#tokenizador .resultado");
const salidaPesos = document.querySelector("#codificador .resultado");
const salidaLiquido = document.querySelector("#ternario-liquido .resultado");

// Cada vez que escribes algo, el texto recorre la línea de producción.
function procesar() {
  const limpio = normalizar(entrada.value);
  salidaNormalizar.textContent = limpio || "(vacío)";

  const fichas = tokenizar(limpio);
  salidaTokens.replaceChildren();
  for (const f of fichas) {
    const fila = document.createElement("li");
    fila.textContent = `${f.token}  →  id ${f.id === 0 ? "0 (desconocida)" : f.id}  →  [${f.vector.join(", ")}]`;
    salidaTokens.appendChild(fila);
  }

  // Estación 4: cada ficha recibe un peso y el motivo de ese peso.
  const codificadas = codificar(fichas);
  salidaPesos.replaceChildren();
  for (const f of codificadas) {
    const fila = document.createElement("li");
    fila.textContent = `${f.token} → ${f.peso} (${f.motivo})`;
    salidaPesos.appendChild(fila);
  }

  // Estación 5: todos los vectores se licúan en uno solo.
  const mezcla = licuar(codificadas);
  const fuerte = rasgoMasFuerte(mezcla.vector);
  salidaLiquido.innerText =
    `[${mezcla.vector.join(", ")}]\n` +
    `${mezcla.estado}: ${mezcla.nota}\n` +
    `Rasgo más fuerte: ${fuerte.rasgo} (${fuerte.valor})`;
}

entrada.addEventListener("input", procesar);
procesar();
