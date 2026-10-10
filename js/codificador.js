// Estación 4: da un peso a cada ficha; las palabras vacías y las repetidas pesan menos.

// Palabras vacías por grupo. Van sin tildes porque los tokens ya están normalizados
// ("segun"; "mi" cubre "mí"). Es una lista inicial: algunos pronombres pueden importar.
export const ARTICULOS = ["el", "la", "los", "las", "un", "una", "unos", "unas", "lo"];

export const PREPOSICIONES = [
  "a", "ante", "bajo", "con", "contra", "de", "desde", "en", "entre",
  "hacia", "hasta", "para", "por", "segun", "sin", "sobre", "tras",
];

export const CONJUNCIONES = ["y", "e", "o", "u", "ni", "que", "pero", "sino", "porque"];

export const CONTRACCIONES = ["al", "del"];

export const PRONOMBRES = ["me", "te", "se", "le", "les", "nos", "mi", "tu", "su", "sus"];

export const DEMOSTRATIVOS = ["este", "esta", "esto", "ese", "esa", "eso"];

// Nombre de cada grupo tal como aparece en el motivo.
export const GRUPOS_VACIAS = {
  "artículo": ARTICULOS,
  "preposición": PREPOSICIONES,
  "conjunción": CONJUNCIONES,
  "contracción": CONTRACCIONES,
  "pronombre": PRONOMBRES,
  "demostrativo": DEMOSTRATIVOS,
};

// Todos los grupos juntos, en un Set para búsquedas rápidas.
export const PALABRAS_VACIAS = new Set(Object.values(GRUPOS_VACIAS).flat());

/**
 * @param {string} token - Palabra normalizada.
 * @returns {string|null} Grupo de la palabra vacía, o `null`.
 */
export function grupoDe(token) {
  for (const [grupo, palabras] of Object.entries(GRUPOS_VACIAS)) {
    if (palabras.includes(token)) return grupo;
  }
  return null;
}

const PESO_BASE = 1;
const CASTIGO_VACIA = 0.2;
const CASTIGO_REPETIDA = 0.5;

/**
 * Multiplica el vector por el peso de la ficha.
 * @param {{vector: Array<number>, peso: number}} ficha
 * @returns {Array<number>} Redondeado a 2 decimales.
 */
export function vectorPonderado(ficha) {
  return ficha.vector.map((v) => redondear(v * ficha.peso));
}

/**
 * Redondea a 2 decimales; `+ 0` evita -0.
 * @param {number} n
 * @returns {number}
 */
function redondear(n) {
  return Math.round(n * 100) / 100 + 0;
}

/**
 * @typedef {Object} FichaCodificada
 * @property {string} token
 * @property {number} id
 * @property {Array<-1|0|1>} vector
 * @property {number} peso - 1, ×0.2 si es vacía, ×0.5 si es repetida.
 * @property {string} motivo - Ej. `"palabra vacía: preposición, repetida"`.
 * @property {Array<number>} vectorPonderado - `vector` × `peso`.
 */

/**
 * Agrega peso, motivo y vector ponderado a cada ficha (crea objetos nuevos).
 * @param {Array<import("./tokenizador.js").Ficha>} fichas - Salida de `tokenizar()`.
 * @returns {Array<FichaCodificada>} En el mismo orden.
 */
export function codificar(fichas) {
  const vistas = new Set();

  return fichas.map((ficha) => {
    let peso = PESO_BASE;
    const razones = [];

    if (PALABRAS_VACIAS.has(ficha.token)) {
      peso *= CASTIGO_VACIA;
      razones.push(`palabra vacía: ${grupoDe(ficha.token)}`);
    }
    if (vistas.has(ficha.token)) {
      peso *= CASTIGO_REPETIDA;
      razones.push("repetida");
    }
    vistas.add(ficha.token);

    const nueva = {
      ...ficha,
      peso: redondear(peso),
      motivo: razones.length ? razones.join(", ") : "con significado",
    };
    nueva.vectorPonderado = vectorPonderado(nueva);
    return nueva;
  });
}
