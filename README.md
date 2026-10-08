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
