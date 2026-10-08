// El "director": toma el texto y lo pasa de estación en estación.
import { normalizar } from "./normalizar.js";
import { tokenizar } from "./tokenizador.js";

const entrada = document.querySelector("#entrada");
const salidaNormalizar = document.querySelector("#normalizar .resultado");
const salidaTokens = document.querySelector("#tokenizador .resultado");

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
}

entrada.addEventListener("input", procesar);
procesar();
