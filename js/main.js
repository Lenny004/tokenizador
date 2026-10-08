// El "director": toma el texto y lo pasa de estación en estación.
import { normalizar } from "./normalizar.js";

const entrada = document.querySelector("#entrada");
const salidaNormalizar = document.querySelector("#normalizar .resultado");

// Cada vez que escribes algo, el texto recorre la línea de producción.
function procesar() {
  const limpio = normalizar(entrada.value);
  salidaNormalizar.textContent = limpio || "(vacío)";
}

entrada.addEventListener("input", procesar);
procesar();
