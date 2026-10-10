# Prompt: Documentación de código JavaScript

## Contexto

Analiza el proyecto indicado y documenta sus archivos `.js`, `.mjs` y `.cjs` sin modificar la lógica, el comportamiento ni la arquitectura existente.

La documentación debe ayudar a comprender qué hace cada módulo y función, qué datos esperan y devuelven, el comportamiento asíncrono y las decisiones no evidentes del código.

## Objetivo

Recorrer los archivos `.js`, `.mjs` y `.cjs` del proyecto y agregar o completar documentación clara, técnica y consistente en español.

No se debe refactorizar, corregir ni rediseñar el código. La única finalidad es documentarlo.

## Reglas generales

1. No modificar la lógica de negocio ni el comportamiento existente.
2. No cambiar nombres, firmas, tipos, imports ni estructura del código. No reformatear, reordenar ni reindentar código existente.
3. No agregar dependencias, configuración ni herramientas (linters, formateadores, generadores de documentación).
4. No convertir entre paradigmas o estilos: clases y funciones, callbacks y promesas, código síncrono y asíncrono.
5. Conservar la documentación existente si es correcta. Si contradice el código, corregirla y reportarlo en la entrega.
6. Escribir los comentarios en español. Mantener sin traducir los identificadores, nombres de API y términos técnicos tal como aparecen en el código.
7. Mantener el estilo de documentación usado en el proyecto. Si el proyecto no define uno, usar JSDoc.
8. Explicar el propósito y las decisiones importantes, no describir cada línea.
9. No documentar como hecho una funcionalidad que todavía no existe, que está comentada o que no se usa.
10. No inventar reglas, flujos, estados, motivos ni efectos secundarios. Si algo no se puede determinar con certeza a partir del código, las pruebas o la documentación del proyecto, no lo supongas: omítelo y regístralo en "Puntos que requieren confirmación".
11. No afirmar que el código cumple un estándar, patrón o principio (por ejemplo "aplica Clean Architecture" o "es seguro frente a inyección SQL") salvo que el propio proyecto lo declare. Describir el comportamiento observable.
12. No copiar a la documentación secretos, credenciales, tokens, claves, hosts o IPs internos ni datos personales que aparezcan en el código. Si encuentras alguno, no reproduzcas su valor y repórtalo en la entrega.
13. Conservar intactas las directivas para herramientas (por ejemplo `eslint-disable`, `@ts-ignore`, `noqa`, `type: ignore`, `phpcs:ignore`, `@phpstan-ignore`, `istanbul ignore`, `pragma`) y los TODO/FIXME existentes. No son documentación.
14. No agregar comentarios redundantes que repitan literalmente el nombre del elemento.
15. No modificar archivos fuera del alcance indicado salvo que se solicite expresamente.

## Alcance de archivos

Incluir: `.js`, `.mjs` y `.cjs`.

Excluir por defecto:

- `node_modules/`, `dist/`, `build/`, `coverage/` y `vendor/`;
- archivos minificados (`*.min.js`) y bundles;
- archivos `.jsx`, que corresponden al prompt de React;
- archivos generados automáticamente (con encabezados como "auto-generated" o "DO NOT EDIT");
- archivos de prueba: usarlos como fuente de contexto sobre el comportamiento esperado, pero no documentarlos salvo que se pida;
- archivos de otros lenguajes o formatos.

## Funciones y métodos

Documentar con JSDoc (`/** */`) cada función no trivial. JavaScript no declara tipos, así que los tipos escritos en JSDoc forman parte de la documentación y deben incluirse cuando no sean evidentes:

- `@param {tipo} nombre - descripción`, incluyendo valores por defecto y restricciones;
- `@returns {tipo} descripción`;
- `@throws {Error}` cuando la función lanza errores de forma explícita;
- `@typedef` para objetos con una forma específica y `@callback` para funciones recibidas como argumento.

Ejemplo:

```js
/**
 * Agrupa los registros por la clave indicada.
 *
 * @param {Array<Object>} registros - Lista de registros; cada uno debe tener la propiedad indicada en `clave`.
 * @param {string} clave - Nombre de la propiedad usada para agrupar.
 * @returns {Object<string, Array<Object>>} Mapa de valor de la clave a los registros que lo comparten.
 */
function agruparPor(registros, clave) {
  // ...
}
```

## Módulos

- Documentar el propósito de cada módulo y qué exporta cuando no sea evidente por el nombre.
- Documentar los efectos que ocurren al importar el módulo (código que se ejecuta fuera de funciones, registro de listeners, lectura de configuración).
- En módulos con estado a nivel de archivo (variables mutables, cachés, singletons), explicar qué estado guardan y quién lo modifica.

## Clases y prototipos

- Documentar la responsabilidad de la clase, los parámetros del constructor y las propiedades públicas.
- Documentar la herencia solo cuando el motivo no sea evidente.
- Explicar el valor de `this` cuando dependa de cómo se invoque el método (callbacks, eventos, `bind`).
- Documentar getters y setters cuando calculen o validen algo más allá de leer o asignar.

## Asincronía

Documentar funciones con promesas, `async/await`, callbacks, eventos o temporizadores cuando no sea evidente:

- qué valor resuelve la promesa y bajo qué condiciones se rechaza;
- en qué orden se ejecutan las operaciones cuando importa;
- si la operación puede cancelarse (`AbortController`) o repetirse;
- qué ocurre con los errores: se propagan, se capturan o se ignoran.

## Navegador y DOM (si aplica)

- Qué elementos del DOM consulta o modifica y qué selectores o identificadores espera.
- Qué eventos registra, cuándo los elimina y qué hace cada handler.
- Qué datos guarda en `localStorage`, `sessionStorage` o cookies, con qué claves y formato.
- Qué solicitudes `fetch` o `XMLHttpRequest` realiza y cómo trata los errores.

## Comparaciones y coerciones

Documentar el motivo cuando el código dependa de una coerción o comparación no evidente (`==` en lugar de `===`, valores "falsy" con significado funcional, conversiones implícitas). No corregirlas.

## Valores y unidades

Indicar unidades y formatos cuando no sean evidentes: milisegundos o segundos, fechas en cadena o en objeto `Date`, zonas horarias, monedas, porcentajes como fracción o entero.

## Riesgos específicos de JavaScript

- No agregar `// @ts-check` ni `// @flow`: activan la verificación de tipos y cambian el resultado de las herramientas del proyecto.
- No agregar, quitar ni mover `"use strict"`: cambia la semántica del código.
- No insertar texto dentro de expresiones regulares, cadenas ni plantillas de texto: ahí un `/* */` o `//` no es un comentario.
- Conservar los comentarios funcionales o legales: `//# sourceMappingURL=...`, `/*! ... */`, `#!/usr/bin/env node` en la primera línea.
- No documentar archivos minificados ni bundles.

## Aspectos transversales

Cuando el código los implemente, documentar los siguientes aspectos. Describir lo que el código hace, sin evaluarlo y sin agregar lo que no hace. No es una lista para completar: solo se documenta lo que existe.

- **Entradas y validaciones:** qué se valida, con qué formato, rango o unidad, y qué ocurre cuando la validación falla.
- **Salidas:** qué se devuelve o emite, incluidos los casos vacíos, nulos o de error.
- **Acceso:** autenticación, roles o permisos que se exigen antes de ejecutar.
- **Efectos secundarios:** escrituras en base de datos, archivos, red, caché, sesión, estado compartido o eventos emitidos.
- **Transacciones y consistencia:** dónde empieza y termina una transacción y qué se revierte si falla.
- **Idempotencia y concurrencia:** si repetir la operación es seguro y qué mecanismo lo garantiza (bloqueo, clave única, versión), solo si existe.
- **Errores y recuperación:** qué errores se lanzan, se capturan o se propagan; reintentos, tiempos límite y valores de respaldo.
- **Observabilidad:** registros, métricas, identificadores de correlación o auditoría que el código genera.
- **Configuración:** variables de entorno o ajustes que lee y qué cambian (nunca valores reales).

## Comentarios inline

- Usar comentarios inline solo cuando expliquen el motivo de una decisión.
- Preferir un comentario por bloque lógico.
- No comentar sintaxis evidente ni describir literalmente un `if`, un bucle, una asignación o un `return`.
- Indicar unidades, formatos o restricciones cuando no sean evidentes.
- No dejar comentarios sobre el propio proceso de documentación (por ejemplo "documentado por IA") ni código comentado.

## Proceso

1. Identificar los archivos del alcance y ordenarlos de lo básico a lo general: utilidades y tipos, luego lógica y servicios, al final los puntos de entrada. Así el contexto ya está documentado cuando se llega a las piezas que dependen de él.
2. Leer el contexto antes de documentar: el archivo completo, dónde se usa, sus pruebas y la documentación del proyecto (README, `docs/`).
3. Detectar el estilo de documentación existente y adoptarlo. Comprobar si el proyecto consume los comentarios como parte de su funcionamiento o de su documentación generada (ver "Riesgos específicos"); en ese caso, redactarlos pensando en ese lector y reportarlo.
4. Revisar funciones exportadas, efectos al importar, asincronía y estado a nivel de módulo.
5. Conservar la documentación correcta y agregar únicamente la que falta.
6. En proyectos grandes, trabajar por lotes pequeños (una carpeta o módulo a la vez) y verificar entre lotes.
7. Verificar que no haya cambios funcionales revisando el diff (`git diff`): toda línea agregada debe ser un comentario o una línea en blanco que lo acompañe, y toda línea eliminada debe ser un comentario anterior que se reemplazó o corrigió. Cualquier otra diferencia es un error y debe revertirse.
8. Ejecutar las verificaciones disponibles del proyecto sin modificar su configuración: `node --check <archivo>` en cada archivo modificado (verifica solo la sintaxis) y los scripts de `package.json` (`lint`, `test`) si existen. No ejecutar comandos que modifiquen datos, bases de datos o servicios externos.
9. Releer los comentarios: deben ser claros, breves, coherentes con el código y sin información inventada.

## Formato de entrega

Por cada archivo modificado, informar:

1. Ruta del archivo.
2. Resumen de una línea sobre lo documentado.
3. Funciones, clases o módulos documentados.
4. Confirmación de que no se modificó la lógica.
5. Resultado de las verificaciones ejecutadas.

Al final del informe, agregar:

- **Puntos que requieren confirmación:** lo que no se pudo determinar con certeza y se omitió.
- **Hallazgos:** documentación existente corregida por contradecir el código, código sin uso y posibles secretos expuestos (sin reproducir su valor).
- **Sin cambios:** archivos que no requerían documentación, con una nota breve.

Si una verificación no se pudo ejecutar, indicar cuál y por qué.
