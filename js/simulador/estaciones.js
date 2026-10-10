// ==================================================================
// REGISTRO DE ESTACIONES
// ------------------------------------------------------------------
// Aquí se decide QUÉ HACE cada caja cuando el pulso la dispara.
// Es un objeto sencillo:  tipoDeEstacion -> { procesar, pendiente }
//   - procesar(dato, entradaUsuario) recibe lo que dejó la estación
//     anterior y devuelve el resultado de este paso.
//   - pendiente: true si la estación todavía no está construida.
//
// Para conectar una estación nueva (por ejemplo el codificador):
//   1. Escribe la función en js/codificador.js y expórtala.
//   2. Impórtala aquí arriba.
//   3. Cambia su entrada en ESTACIONES: procesar: codificar, pendiente: false.
// ¡Nada más! El simulador la usará automáticamente.
// ==================================================================
import { normalizar } from '../normalizar.js';
import { tokenizar } from '../tokenizador.js';
import { codificar } from '../codificador.js';
import { licuar, rasgoMasFuerte } from '../liquido.js';

// Estación que aún no existe: deja pasar el dato sin tocarlo.
const pasarIgual = (dato) => dato;

export const ESTACIONES = {
  // 1. La primera caja no recibe nada: toma el texto del cuadro de entrada.
  texto:       { procesar: (_dato, entradaUsuario) => entradaUsuario, pendiente: false },
  // 2. Deja el texto limpio (minúsculas, sin tildes ni signos).
  normalizar:  { procesar: (texto) => normalizar(String(texto ?? '')), pendiente: false },
  // 3. Parte el texto en fichas { token, id, vector }.
  tokenizador: {
    procesar: (texto) => {
      if (typeof texto !== 'string') throw new Error('El tokenizador necesita texto (¿está conectado después de Normalizar?)');
      return tokenizar(texto);
    },
    pendiente: false,
  },
  // 4. Le pone un peso a cada ficha (palabras vacías y repetidas pesan menos).
  codificador: {
    procesar: (fichas) => {
      if (!Array.isArray(fichas)) throw new Error('El codificador necesita fichas (¿está conectado después del Tokenizador?)');
      return codificar(fichas);
    },
    pendiente: false,
  },
  // 5. Licúa todos los vectores ponderados en uno solo (promedio ponderado).
  liquido: {
    procesar: (fichas) => {
      if (!Array.isArray(fichas)) throw new Error('El ternario líquido necesita fichas (¿está conectado después del Codificador?)');
      return licuar(fichas);
    },
    pendiente: false,
  },
  // 6. Pendiente (próxima clase): deja pasar la mezcla sin cambios.
  prediccion:  { procesar: pasarIgual, pendiente: true },
  // Caja final: muestra lo último que llegó.
  salida:      { procesar: pasarIgual, pendiente: false },
};

// Ejecuta la estación de una caja. Si el tipo no está en el registro
// (por ejemplo una "Neurona" genérica), el dato pasa igual.
export function ejecutarEstacion(tipo, dato, entradaUsuario) {
  const estacion = ESTACIONES[tipo];
  if (!estacion) return { resultado: dato, pendiente: false, error: null };
  try {
    return { resultado: estacion.procesar(dato, entradaUsuario), pendiente: estacion.pendiente, error: null };
  } catch (err) {
    return { resultado: dato, pendiente: false, error: err.message };
  }
}

// Convierte un resultado en texto corto para dibujarlo debajo de la caja.
export function resumen(dato) {
  if (dato === undefined) return '';
  if (typeof dato === 'string') return `"${dato}"`;
  if (Array.isArray(dato) && dato.every((f) => f && 'token' in f)) {
    // Si ya tienen peso (pasaron por el codificador), mostramos el peso.
    return dato.map((f) => ('peso' in f ? `${f.token}·${f.peso}` : `${f.token}#${f.id}`)).join(' ');
  }
  if (esMezcla(dato)) return `[${dato.vector.join(', ')}] · ${dato.estado}`;
  return JSON.stringify(dato);
}

// ¿Es el resultado del ternario líquido? ({ vector, estado, ... })
const esMezcla = (dato) => dato && Array.isArray(dato.vector) && 'estado' in dato;

// Versión larga para el inspector (una ficha por línea).
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
