// Estación 4: codificador.
// Objetivo: darle un PESO a cada ficha según qué tan importante es.
// Las palabras con significado (sustantivos, verbos, adjetivos) pesan 1.
// Las palabras "de relleno" y las repetidas pesan menos.

// Palabras vacías (stopwords): aparecen muchísimo pero dicen poco.
// OJO: los tokens ya vienen normalizados (minúsculas, sin tildes, la ñ se queda),
// así que la lista también va sin tildes: "segun" y no "según";
// "mi" sirve también para "mí", porque la tilde ya se borró.
// Esta lista es un punto de partida: algunos pronombres sí pueden importar
// (por ejemplo "mí" en "es para mí"). Se puede ajustar en clase.
export const PALABRAS_VACIAS = new Set([
  // Artículos
  "el", "la", "los", "las", "un", "una", "unos", "unas", "lo",
  // Preposiciones
  "a", "ante", "bajo", "con", "contra", "de", "desde", "en", "entre",
  "hacia", "hasta", "para", "por", "segun", "sin", "sobre", "tras",
  // Conjunciones
  "y", "e", "o", "u", "ni", "que", "pero", "sino", "porque",
  // Contracciones (a + el, de + el)
  "al", "del",
  // Pronombres y determinantes comunes
  "me", "te", "se", "le", "les", "nos", "mi", "tu", "su", "sus",
  "este", "esta", "esto", "ese", "esa", "eso",
]);

const PESO_BASE = 1;        // palabra con significado
const CASTIGO_VACIA = 0.2;  // palabra vacía: vale la quinta parte
const CASTIGO_REPETIDA = 0.5; // ya la vimos antes: vale la mitad

// Multiplica cada número del vector por el peso de la ficha.
// Esto es lo que usarán las próximas estaciones.
export function vectorPonderado(ficha) {
  return ficha.vector.map((v) => redondear(v * ficha.peso));
}

// Redondea a 2 decimales (y evita que salga -0).
function redondear(n) {
  return Math.round(n * 100) / 100 + 0;
}

// Recibe las fichas del tokenizador y devuelve las mismas fichas
// con tres datos nuevos: peso, motivo y vectorPonderado.
export function codificar(fichas) {
  const vistas = new Set(); // palabras que ya aparecieron en la frase

  return fichas.map((ficha) => {
    let peso = PESO_BASE;
    const razones = [];

    if (PALABRAS_VACIAS.has(ficha.token)) {
      peso *= CASTIGO_VACIA;
      razones.push("palabra vacía");
    }
    if (vistas.has(ficha.token)) {
      peso *= CASTIGO_REPETIDA;
      razones.push("repetida");
    }
    vistas.add(ficha.token);

    const nueva = {
      ...ficha,                      // token, id y vector se quedan igual
      peso: redondear(peso),
      motivo: razones.length ? razones.join(", ") : "con significado",
    };
    nueva.vectorPonderado = vectorPonderado(nueva);
    return nueva;
  });
}
