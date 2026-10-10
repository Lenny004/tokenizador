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

Resultado esperado: con "¡QUIERO Pupusas de Queso y de frijol!", la estación **Normalizar** muestra `quiero pupusas de queso y de frijol`, el **Tokenizador** muestra cada palabra con su ID y su vector, y el **Codificador** da `de → 0.2 (palabra vacía: preposición)` y al segundo `de` le da 0.1, porque además está repetido.

Desde `index.html` hay un enlace a `simulador.html`: escribe la frase arriba, pulsa **Play** y haz clic en una caja para ver su salida en el panel derecho.

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
│   ├── red.js              # estaciones 5 y 6: pendiente
│   ├── vectores.js         # base de datos vectorial: pendiente
│   ├── simulador.js        # arranca el simulador
│   └── simulador/          # núcleo (EventBus), grafo, motor, dibujo, interfaz, app y registro de estaciones
├── data/
│   └── ejemplos.json       # preguntas y respuestas de ejemplo (todavía vacío)
└── pruebas/
    └── pesos-aprendidos.js # muestra por qué el codificador castiga palabras vacías
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
```

`pesos-aprendidos.js` simula vectores ya aprendidos por la red y compara "de" y "pupusas" sin castigo y con el codificador: "de" pasa de `[0.3, -0.1, 0.4]` a `[0.06, -0.02, 0.08]`.

<!-- section:roadmap -->
## 🗺️ Hoja de ruta y estado

- [x] Estación 2: normalizar
- [x] Estación 3: tokenizador ternario
- [x] Estación 4: codificador
- [x] Simulador visual conectado a las estaciones
- [ ] Estación 5: ternario líquido
- [ ] Estación 6: red neuronal con softmax, temperatura y predicción token a token
- [ ] Base de datos vectorial (10 formas de cada pregunta y de cada respuesta)
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
