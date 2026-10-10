# Tokenizador Ternario

Proyecto de horas sociales: una línea de producción que convierte texto en números y predice una respuesta, explicada paso a paso.

## Las estaciones

1. **Texto natural**: lo que escribe la persona.
2. **Normalizar**: dejar el texto escrito siempre igual (minúsculas, sin tildes ni signos).
3. **Tokenizador ternario**: partir el texto en tokens y convertir cada uno en un vector de -1, 0 y +1.
4. **Codificador**: darle un peso a cada token y castigar repetidas, conectores y puntos.
5. **Ternario líquido**: el texto ya convertido en números limpios.
6. **Predicción estocástica**: la red neuronal elige la siguiente palabra con softmax y temperatura.

## Cómo correrlo

Como usa módulos de JavaScript, ábrelo con un servidor local (por ejemplo la extensión Live Server de VS Code) en vez de doble clic.

## Simulador visual (simulador.html)

Abre `simulador.html` (hay un enlace desde `index.html`). Verás las 6 estaciones y la caja **Salida** como cajas conectadas. Escribe una frase arriba y pulsa **Play**: el pulso viaja de caja en caja y, cuando una caja "dispara", calcula su paso real (Normalizar usa `normalizar()`, Tokenizador usa `tokenizar()`). Haz clic en una caja para ver su salida en el inspector. Las estaciones 4, 5 y 6 aparecen como *pendiente (próxima clase)* y dejan pasar el dato sin cambios.

Código: `js/simulador.js` arranca todo y `js/simulador/` tiene las piezas (núcleo con el EventBus, grafo, motor, dibujo, interfaz y app).

### Cómo conectar una estación nueva

Todo está en `js/simulador/estaciones.js`, en el objeto `ESTACIONES` (tipo de caja → función). Por ejemplo, para el codificador:

1. Escribe y exporta la función en `js/codificador.js`.
2. Impórtala en `estaciones.js`.
3. Cambia su línea a `codificador: { procesar: codificar, pendiente: false }`.

## Estación 4: Codificador (js/codificador.js)

`codificar(fichas)` le agrega a cada ficha un `peso`, un `motivo` y su `vectorPonderado` (vector × peso). Peso base 1; si es palabra vacía (`PALABRAS_VACIAS`) se multiplica por 0.2; si ya apareció antes en la frase, por 0.5. Ejemplo: el segundo "de" pesa 0.1. Se ve en el tablero y en el simulador (caja Codificador).
