<!-- readme-standard:v1 -->
<!-- Esta línea permite que los agentes de IA reconozcan y actualicen este README. No la borres. -->

<!-- section:header -->
# Tokenizador

> Línea de producción que convierte texto en español en números ternarios y predice una respuesta, explicada paso a paso.

<!-- section:highlights -->
## 🌟 Aspectos destacados

- **Ves cada paso en vivo**: mientras escribes, cada estación del tablero muestra su resultado.
- **Simulador visual**: en `simulador.html` las estaciones son cajas conectadas, y al pulsar Play el pulso recorre la línea y cada caja calcula su paso real.
- **Pensado para el español**: conserva la ñ ("año" no es "ano") y une palabras con y sin tilde o diéresis ("pingüino" = "pinguino").
- **Palabras vacías ordenadas por tipo**: artículos, preposiciones, conjunciones, contracciones, pronombres y demostrativos tienen cada uno su arreglo.
- **Una red neuronal que se entiende**: una sola capa lineal con softmax y temperatura genera la respuesta palabra por palabra, y muestra las 3 opciones más probables de cada paso.
- **Base de datos vectorial**: 4 intenciones con 10 formas de preguntar cada una; la frase se compara por similitud coseno y, si no se parece a nada, responde la red neuronal.
- **Sin instalar nada**: HTML, CSS y JavaScript puro, sin dependencias.

<!-- section:overview -->
## ℹ️ Descripción

Proyecto de horas sociales para entender cómo una máquina "lee" texto. Una frase pasa por seis estaciones: **texto natural → normalizar → tokenizador ternario → codificador → ternario líquido → predicción estocástica**, y al final sale una respuesta de texto o de código.

Cada estación es un módulo de JavaScript independiente. El tokenizador convierte cada palabra en un vector de -1, 0 y +1, y el codificador le da un peso según cuánto aporta (las palabras vacías y las repetidas valen menos). El simulador usa una arquitectura por eventos (EventBus): cuando una caja "dispara", ejecuta su estación con la salida de la anterior.

**Stack:** HTML, CSS, JavaScript (módulos ES) y Canvas 2D para el simulador.

<!-- section:installation -->
## ⬇️ Instalación

```bash
git clone https://github.com/Lenny004/tokenizador.git
cd tokenizador
```

No hay dependencias que instalar.

<!-- section:usage -->
## 🚀 Uso

Como el proyecto usa módulos de JavaScript (`import`), hay que abrirlo con un servidor local, por ejemplo la extensión **Live Server** de VS Code. Con doble clic el navegador bloquea los módulos.

1. Abre `index.html` con Live Server.
2. Escribe una frase en **Texto natural**.

Resultado esperado: con "¡QUIERO Pupusas de Queso y de frijol!", la estación **Normalizar** muestra `quiero pupusas de queso y de frijol`, el **Tokenizador** muestra cada palabra con su ID y su vector, y el **Codificador** da `de → 0.2 (palabra vacía: preposición)` y al segundo `de` le da 0.1 (`repetida 1 vez`). Cada repetición vuelve a dividir el peso entre 2: un tercer `de` pesaría 0.05 y un cuarto 0.025. El **Ternario líquido** mezcla todo en `[0.22, -0.44, 0.67]` (estado `ok`, rasgo más fuerte: desayuno). La **Predicción estocástica** busca primero en la base vectorial: la frase se parece en un 86.4 % a "Quiero pupusas de queso" y responde `¡Claro! Sus pupusas van con curtido y salsa.` en el panel **Texto**. Con "Diséñame una web html" la respuesta es código HTML y aparece en el panel **Código**. Si la frase no se parece a ningún ejemplo (similitud menor que 0.4), responde la red neuronal palabra por palabra; por ejemplo, "quiero pupusas de queso" sola, sin la base, da `con curtido y salsa`.

La barra **Temperatura** (0.1 a 2) de la estación 6 cambia qué tan arriesgada es la respuesta: baja = siempre la palabra más probable, alta = más variedad.

Desde `index.html` hay un enlace a `simulador.html`: escribe la frase arriba, pulsa **Play** y haz clic en una caja para ver su salida en el panel derecho. El control **T** de la barra ajusta la temperatura para el siguiente Play.

<!-- section:structure -->
## 🗂️ Estructura del proyecto

```text
.
├── index.html              # tablero: una caja (div) por estación
├── simulador.html          # simulador visual tipo n8n con las estaciones conectadas
├── css/
│   ├── estilos.css         # estilos del tablero
│   └── simulador.css       # estilos del simulador
├── js/
│   ├── main.js             # director del tablero: pasa el texto de estación en estación
│   ├── normalizar.js       # estación 2: minúsculas, sin tildes ni signos, conserva la ñ
│   ├── tokenizador.js      # estación 3: vocabulario, IDs y vectores de -1, 0 y +1
│   ├── codificador.js      # estación 4: pesos, palabras vacías por tipo y repetidas
│   ├── liquido.js          # estación 5: licúa los vectores ponderados en uno solo (promedio ponderado)
│   ├── red.js              # estación 6: red lineal + softmax, entrenamiento y predicción token a token
│   ├── vectores.js         # base de datos vectorial: bolsa de palabras con pesos, similitud coseno y respaldo con la red
│   ├── simulador.js        # arranca el simulador
│   └── simulador/          # núcleo (EventBus), grafo, motor, dibujo, interfaz, app y registro de estaciones
├── data/
│   ├── ejemplos.json       # "preguntas" (10 formas por intención), "respuestas" (texto o código) y "entrenamiento" (pares de la red)
│   └── ejemplos.js         # copia de ejemplos.json como módulo JS (el navegador lo importa sin fetch)
├── pruebas/
│   ├── pesos-aprendidos.js # muestra por qué el codificador castiga palabras vacías
│   ├── codificador.js      # prueba el castigo progresivo por repetición de la estación 4
│   ├── liquido.js          # prueba la estación 5 con frases normales, vacías y sin significado
│   ├── vectores.js         # prueba la base vectorial: búsqueda, paráfrasis, umbral y respaldo
│   └── red.js              # prueba softmax, temperatura, entrenamiento y predicción de la estación 6
└── skills/                 # guías de documentación del proyecto: README y JSDoc
```

<!-- keep -->
### Cómo conectar una estación nueva al simulador

Todo está en `js/simulador/estaciones.js`, en el objeto `ESTACIONES` (tipo de caja → función):

1. Escribe y exporta la función en su archivo, por ejemplo `js/red.js`.
2. Impórtala en `estaciones.js`.
3. Cambia su línea a `{ procesar: tuFuncion, pendiente: false }`.
<!-- /keep -->

<!-- section:testing -->
## ✅ Pruebas

Requiere [Node.js](https://nodejs.org/) para correrlas desde la terminal:

```bash
node pruebas/pesos-aprendidos.js
node pruebas/codificador.js
node pruebas/liquido.js
node pruebas/red.js
node pruebas/vectores.js
```

`pesos-aprendidos.js` simula vectores ya aprendidos por la red y compara "de" y "pupusas" sin castigo y con el codificador: "de" pasa de `[0.3, -0.1, 0.4]` a `[0.06, -0.02, 0.08]`.

`codificador.js` revisa el castigo progresivo: en "quiero de queso de frijol de revuelta de" los `de` pesan 0.2, 0.1, 0.05 y 0.025; "pupusas" repetida pesa 1, 0.5 y 0.25, y el motivo dice `repetida 2 veces`.

`liquido.js` revisa la estación 5: "quiero pupusas de queso" da `[0.31, -0.31, 0.63]` (ok, rasgo más fuerte: desayuno), "de y de" da `[0, 0, 0]` (sin significado) y una frase vacía da `[0, 0, 0]` (vacío), sin `NaN`.

`red.js` revisa la estación 6: que `ejemplos.js` y `ejemplos.json` tengan los mismos pares, que softmax sume 1, que con temperatura 0.1 la opción más probable pase de 0.95, que la pérdida baje al entrenar (de 2.803 a 0.069) y que "quiero pupusas de queso" responda `con curtido y salsa`.

`vectores.js` revisa la base vectorial: que `ejemplos.js` y `ejemplos.json` coincidan, que cada una de las 40 frases encuentre su propia intención, que "hazme una página en html" (frase nueva) llegue a html con 67.5 %, que "asdf qwer zxcv" quede bajo el umbral y que la frase del tablero reciba una respuesta real.

<!-- section:roadmap -->
## 🗺️ Hoja de ruta y estado

- [x] Estación 2: normalizar
- [x] Estación 3: tokenizador ternario
- [x] Estación 4: codificador
- [x] Simulador visual conectado a las estaciones
- [x] Estación 5: ternario líquido
- [x] Estación 6: red neuronal con softmax, temperatura y predicción token a token
- [x] Base de datos vectorial (10 formas de cada pregunta y de cada respuesta)
- [ ] Salida de texto y código, y detector de errores de lógica en JS

<!-- section:contributing -->
## 💭 Soporte y contribuciones

Para reportar un error o proponer una mejora, abre un issue en el repositorio de GitHub.

<!-- section:authors -->
## ✍️ Autores y agradecimientos

- Lenny Elias ([@Lenny004](https://github.com/Lenny004)): desarrollo, como parte de sus horas sociales.
- El encargado de horas sociales, que diseñó la línea de producción del proyecto.

<!-- section:license -->
## 📄 Licencia

TODO(readme): el repositorio todavía no tiene archivo `LICENSE`; falta elegir una licencia.
