// Registro de estaciones: tipo de caja -> { procesar, pendiente }.
import { normalizar } from '../normalizar.js';
import { tokenizar } from '../tokenizador.js';
import { codificar } from '../codificador.js';
import { licuar, rasgoMasFuerte } from '../liquido.js';

// Para estaciones sin implementar: devuelve el dato igual.
const pasarIgual = (dato) => dato;

/**
 * @typedef {Object} Estacion
 * @property {function(*, string): *} procesar - `(dato, entradaUsuario) => resultado`; puede lanzar Error.
 * @property {boolean} pendiente - Sin implementar.
 */
/** @type {Object<string, Estacion>} */
export const ESTACIONES = {
  // La primera caja no recibe dato: usa el texto del campo de entrada.
  texto:       { procesar: (_dato, entradaUsuario) => entradaUsuario, pendiente: false },
  normalizar:  { procesar: (texto) => normalizar(String(texto ?? '')), pendiente: false },
  tokenizador: {
    procesar: (texto) => {
      if (typeof texto !== 'string') throw new Error('El tokenizador necesita texto (¿está conectado después de Normalizar?)');
      return tokenizar(texto);
    },
    pendiente: false,
  },
  codificador: {
    procesar: (fichas) => {
      if (!Array.isArray(fichas)) throw new Error('El codificador necesita fichas (¿está conectado después del Tokenizador?)');
      return codificar(fichas);
    },
    pendiente: false,
  },
  liquido: {
    procesar: (fichas) => {
      if (!Array.isArray(fichas)) throw new Error('El ternario líquido necesita fichas (¿está conectado después del Codificador?)');
      return licuar(fichas);
    },
    pendiente: false,
  },
  prediccion:  { procesar: pasarIgual, pendiente: true },
  salida:      { procesar: pasarIgual, pendiente: false },
};

/**
 * Ejecuta la estación; tipos sin registro o con error devuelven el dato igual.
 * @param {string} tipo
 * @param {*} dato - Salida de la caja anterior.
 * @param {string} entradaUsuario - Texto de `#entrada-sim`.
 * @returns {{resultado: *, pendiente: boolean, error: string|null}}
 */
export function ejecutarEstacion(tipo, dato, entradaUsuario) {
  const estacion = ESTACIONES[tipo];
  if (!estacion) return { resultado: dato, pendiente: false, error: null };
  try {
    return { resultado: estacion.procesar(dato, entradaUsuario), pendiente: estacion.pendiente, error: null };
  } catch (err) {
    return { resultado: dato, pendiente: false, error: err.message };
  }
}

/**
 * Texto corto para mostrar bajo la caja.
 * @param {*} dato
 * @returns {string} `''` si no hay dato.
 */
export function resumen(dato) {
  if (dato === undefined) return '';
  if (typeof dato === 'string') return `"${dato}"`;
  if (Array.isArray(dato) && dato.every((f) => f && 'token' in f)) {
    return dato.map((f) => ('peso' in f ? `${f.token}·${f.peso}` : `${f.token}#${f.id}`)).join(' ');
  }
  if (esMezcla(dato)) return `[${dato.vector.join(', ')}] · ${dato.estado}`;
  return JSON.stringify(dato);
}

// Detecta la salida del ternario líquido.
const esMezcla = (dato) => dato && Array.isArray(dato.vector) && 'estado' in dato;

/**
 * Texto largo para el inspector.
 * @param {*} dato
 * @returns {string}
 */
export function detalle(dato) {
  if (dato === undefined) return '(todavía no ha recibido ningún pulso)';
  if (typeof dato === 'string') return `"${dato}"`;
  if (Array.isArray(dato) && dato.every((f) => f && 'token' in f)) {
    if (dato.length === 0) return '(sin fichas)';
    if ('peso' in dato[0]) {
      return dato.map((f) => `${f.token.padEnd(10)} → ${String(f.peso).padEnd(4)} (${f.motivo})\n${''.padEnd(12)}[${f.vectorPonderado.join(', ')}]`).join('\n');
    }
    return dato.map((f) => `${f.token.padEnd(10)} id ${String(f.id).padStart(2)}  [${f.vector.join(', ')}]`).join('\n');
  }
  if (esMezcla(dato)) {
    const fuerte = rasgoMasFuerte(dato.vector);
    return `vector     [${dato.vector.join(', ')}]\n` +
           `estado     ${dato.estado}\n` +
           `nota       ${dato.nota}\n` +
           `peso total ${dato.pesoTotal}\n` +
           `más fuerte ${fuerte.rasgo} (${fuerte.valor})`;
  }
  return JSON.stringify(dato, null, 2);
}
