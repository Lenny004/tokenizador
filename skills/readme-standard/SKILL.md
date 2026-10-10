---
name: readme-standard
description: Crea, actualiza y migra archivos README.md usando UN formato estándar fijo (mismas secciones, mismo orden, mismos encabezados) en todos los proyectos. Úsalo siempre que el usuario pida crear, generar, escribir, mejorar, revisar, documentar o actualizar un README o "la documentación inicial" de un repositorio, cuando adjunte o mencione un README existente, y cuando cambios en el código (dependencias, scripts, variables de entorno, estructura de carpetas, funcionalidades) puedan dejar el README desactualizado, aunque el usuario no diga la palabra "README". Create, update or migrate README.md files with one fixed structure.
---

# README Standard (v1)

Un solo formato de README para todos los proyectos. Sirve para que cualquier persona sepa dónde está cada cosa y para que cualquier agente pueda **crear** el README igual siempre y **actualizarlo** después editando solo lo que cambió.

Se basa en cuatro fuentes: la guía de freeCodeCamp (qué/por qué/cómo), makeareadme.com (secciones sugeridas), la guía de READMEs de Cornell (formatear todos los README igual, fechas ISO 8601) y la guía de banesullivan (Highlights arriba, README como pitch, respuestas rápidas). Los ejemplos a imitar son Kitware/ITK, marcomusy/vedo y fatiando/pooch.

## Principios

Cada regla de este documento sale de uno de estos principios. Si un caso no está cubierto, razona desde ellos.

1. **Evidencia antes que redacción.** Todo comando, versión, ruta, variable y URL debe salir del repositorio o de lo que dijo el usuario. Un paso de instalación inventado es peor que no tener ninguno, porque hace perder tiempo a quien lo sigue.
2. **Mismo formato siempre.** Mismo orden y mismos encabezados en todos los proyectos. Si una sección no aplica, se omite completa, pero las demás no cambian de lugar. Así el lector y los agentes siempre saben dónde buscar.
3. **El README es el pitch, no el manual.** Debe responder en la primera pantalla: ¿esto resuelve mi problema?, ¿puedo usarlo?, ¿quién lo hizo?, ¿cómo sigo? Lo extenso (API completa, guías largas) va en `docs/` y se enlaza.
4. **Sin secretos.** Nunca escribas credenciales, tokens, claves, IPs o hosts internos reales, ni siquiera de ejemplo "temporal". Usa marcadores (`TU_VALOR_AQUI`) y apunta a `.env.example`. Un README se publica, se copia y se indexa.
5. **Editar, no reescribir.** Al actualizar, se tocan solo las secciones afectadas. El texto que escribió una persona se respeta, porque reescribirlo borra decisiones que no están en el código.

## Elegir el modo

| Situación | Modo |
|---|---|
| No existe `README.md` | **Crear** |
| Existe y su primera línea es `<!-- readme-standard:v1 -->` | **Actualizar** |
| Existe pero sin esa marca (u otra versión) | **Migrar** |
| El usuario adjunta este archivo junto a un README o dice "actualiza/revisa el README" | **Actualizar** (o **Migrar** si no tiene la marca) |

La marca de la línea 1 es lo que permite reconocer un README que ya sigue este estándar. Nunca la borres ni la muevas.

## Modo Crear

### 1. Reunir evidencia

Antes de escribir, inspecciona el repo. Lo que no encuentres se marca como pendiente (ver "Datos faltantes"), no se inventa.

| Busca | Para llenar |
|---|---|
| `package.json`, `composer.json`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `*.csproj`, `go.mod`, `Cargo.toml`, `pubspec.yaml` | nombre, descripción, stack, versiones mínimas, scripts, dependencias |
| lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `composer.lock`) | gestor de paquetes que se debe usar en los comandos |
| `Dockerfile`, `docker-compose.yml`, `.nvmrc`, `.tool-versions` | requisitos y forma de ejecución |
| `.env.example`, archivos de configuración | tabla de Configuración (solo nombres y descripciones, nunca valores reales) |
| `Makefile`, scripts en manifiestos, `.github/workflows/` | comandos de desarrollo, pruebas, CI y badges |
| carpetas de pruebas, `migrations/`, `docs/`, imágenes en `docs/` o `assets/` | Pruebas, Estructura, Capturas |
| `LICENSE`, `CITATION.cff`, `CONTRIBUTING.md`, `AUTHORS` | Licencia, Cómo citar, Contribuciones, Autores |
| árbol de carpetas (2 niveles) | Estructura del proyecto |

El **porqué** del proyecto (qué problema resuelve) rara vez está en el código. Búscalo en documentación existente y comentarios; si no aparece, pregunta al usuario una sola vez y de forma concisa.

**Monorepos y proyectos con varias partes** (por ejemplo `backend/` + `frontend/`): un README raíz que cubre todo con este estándar. Si el usuario pide README por subproyecto, cada uno usa el mismo estándar solo con las secciones que le aplican, y el raíz los enlaza en Estructura.

### 2. Escribir con la plantilla

Copia la plantilla, conserva todos los comentarios `<!-- section:... -->` de las secciones que incluyas, y respeta el orden. Esos comentarios son invisibles al renderizar y son lo que permite a un agente localizar una sección sin adivinar.

````markdown
<!-- readme-standard:v1 -->
<!-- Esta línea permite que los agentes de IA reconozcan y actualicen este README. No la borres. -->

<!-- section:header -->
# Nombre del proyecto

> Una frase: qué es y para quién.

<!-- Solo badges reales: licencia, CI, versión publicada. -->

<!-- section:toc -->
## 📑 Contenido

- [Aspectos destacados](#-aspectos-destacados)

<!-- section:highlights -->
## 🌟 Aspectos destacados

- **Beneficio concreto**: una línea que lo explique.

<!-- section:overview -->
## ℹ️ Descripción

Qué hace, qué problema resuelve y cómo, en párrafos cortos.

**Stack:** tecnologías principales.

<!-- section:visuals -->
## 🖼️ Capturas

![Texto alternativo descriptivo](docs/img/captura.png)

<!-- section:requirements -->
## 📋 Requisitos

- Herramienta ≥ versión

<!-- section:installation -->
## ⬇️ Instalación

```bash
comando
```

<!-- section:usage -->
## 🚀 Uso

```bash
comando
```

Resultado esperado: qué debería verse.

<!-- section:configuration -->
## ⚙️ Configuración

| Variable | Descripción | Ejemplo | Requerida |
|---|---|---|---|
| `NOMBRE` | Qué controla | `valor-de-ejemplo` | Sí |

<!-- section:structure -->
## 🗂️ Estructura del proyecto

```text
.
├── carpeta/    # qué contiene
└── archivo     # para qué sirve
```

<!-- section:data -->
## 🧾 Datos

Archivo por archivo: qué contiene, formato, variables y unidades, códigos de datos faltantes.

<!-- section:development -->
## 🛠️ Desarrollo

```bash
comando para preparar el entorno de desarrollo
```

<!-- section:testing -->
## ✅ Pruebas

```bash
comando
```

<!-- section:roadmap -->
## 🗺️ Hoja de ruta y estado

- [ ] Próximo objetivo

<!-- section:contributing -->
## 💭 Soporte y contribuciones

Dónde pedir ayuda o reportar errores y cómo contribuir.

<!-- section:authors -->
## ✍️ Autores y agradecimientos

- Nombre — rol

<!-- section:citation -->
## 📚 Cómo citar

<!-- section:license -->
## 📄 Licencia

Tipo de licencia. Ver [LICENSE](LICENSE).
````

### 3. Reglas por sección

El orden de la plantilla es fijo. "Siempre" significa que la sección va en todo README; "Si…" significa que se incluye solo cuando se cumple la condición, y si no se cumple se omite entera (nada de encabezados vacíos).

| ID | Cuándo | Contenido y reglas |
|---|---|---|
| `header` | Siempre | Título = nombre real del proyecto (manifiesto o carpeta). Una frase de ≤ 20 palabras. Badges solo si están respaldados por algo real (LICENSE, workflow de CI, paquete publicado); máximo 6. Si el README previo tenía banner o logo, consérvalo encima del título. |
| `toc` | Si el README supera ~150 líneas o 10 secciones | Enlaces a las secciones incluidas. Los anchors siguen la regla de GitHub: minúsculas, espacios a guiones, sin puntuación; el emoji se elimina y deja un guion inicial (`## 🌟 Aspectos destacados` → `#-aspectos-destacados`). |
| `highlights` | Siempre | 3 a 6 viñetas con lo más atractivo, cada una con beneficio concreto y verificable. Nada de adjetivos vacíos ("potente", "moderno"). |
| `overview` | Siempre | Responde qué, por qué y cómo (freeCodeCamp): qué hace, qué problema resuelve, para quién, y por qué se eligió el stack si es relevante. Cierra con una línea **Stack:**. Máximo 3 párrafos de ≤ 4 líneas. |
| `visuals` | Si existen imágenes o GIFs en el repo | Solo rutas que existan. Texto alternativo descriptivo. Nunca inventes capturas. |
| `requirements` | Si hay versiones o herramientas externas necesarias | Versiones mínimas tomadas de `engines`, `require`, `requires-python`, `.nvmrc`, `FROM` en Dockerfile, etc. |
| `installation` | Siempre | Pasos para quien **usa** el proyecto: clonar, instalar dependencias, preparar la base de datos si aplica. Un comando por línea, copiables, con el gestor de paquetes que indica el lockfile. Lo que es solo para desarrollar va en `development`. |
| `usage` | Siempre | El ejemplo mínimo que muestre el proyecto funcionando y el resultado esperado. Sin documentar la API completa: enlaza a `docs/`. |
| `configuration` | Si hay `.env.example` o variables de entorno | Tabla con variable, descripción, ejemplo y si es obligatoria. Valores de ejemplo, nunca reales. Debe coincidir con `.env.example`. Si hay varios componentes (p. ej. `backend/` y `frontend/`), una tabla por componente con el archivo de origen como título en negrita. |
| `structure` | Si hay más de una carpeta de primer nivel relevante | Árbol de máximo 2 niveles, con un comentario de una línea por carpeta o archivo clave (la guía de Cornell pide describir cada archivo). Ignora `node_modules`, `vendor`, `.git`, compilados. |
| `data` | Si el repo incluye conjuntos de datos | Por archivo: contenido, formato, variables con unidades, códigos de datos faltantes, fecha de creación en ISO 8601 (AAAA-MM-DD). |
| `development` | Si hay scripts de desarrollo, lint, build o migraciones | Cómo preparar el entorno de desarrollo y ejecutar lint/build/migraciones. Va aquí y no en Instalación (banesullivan). |
| `testing` | Si hay pruebas | Comando para ejecutarlas y qué cubren. |
| `roadmap` | Si el usuario, issues o docs mencionan planes, o si el proyecto está pausado/archivado | Lista de objetivos. Si el desarrollo está detenido, dilo aquí y en una nota bajo el título (makeareadme). |
| `contributing` | Siempre en repos públicos o de equipo; en privados, una línea de cómo reportar problemas | Dónde pedir ayuda, cómo reportar errores, cómo proponer cambios. Enlaza `CONTRIBUTING.md` si existe. |
| `authors` | Si los autores son conocibles | Nombre, rol y enlace de perfil si lo hay. Toma los datos del manifiesto, `AUTHORS` o lo que diga el usuario. No los deduzcas del historial de git y no incluyas correos. |
| `citation` | Si hay `CITATION.cff`, DOI o el proyecto es académico/de investigación | Cita recomendada. |
| `license` | Siempre | Tipo de licencia según el archivo `LICENSE`. |

### 4. Estilo

- **Idioma:** el del README previo o el que pida el usuario; por defecto, el idioma en que el usuario escribe. Si es inglés, traduce los encabezados con equivalentes directos (Highlights, Overview, Screenshots, Requirements, Installation, Usage, Configuration, Project structure, Data, Development, Testing, Roadmap and status, Support and contributing, Authors and acknowledgments, How to cite, License) y mantén los emojis y los comentarios `section:` sin cambios.
- Un solo vocabulario: no alternes "usuario/cliente" ni "módulo/componente" para lo mismo.
- Bloques de código siempre con lenguaje (`bash`, `php`, `ts`, `sql`, `text`).
- Rutas internas relativas (`docs/guia.md`), no URLs absolutas del repo.
- Fechas en ISO 8601 (AAAA-MM-DD).
- Tono amable y directo; pensado para alguien que apenas conoce el proyecto.

### 5. Comandos inferidos

A veces el comando correcto no está escrito en ningún lado pero se deduce con alta confianza (por ejemplo, levantar un servidor PHP desde `public/`). Inclúyelo solo si es el uso estándar de esa herramienta y **menciónalo en el reporte** como "comando inferido" para que el usuario lo confirme. Si un script del manifiesto apunta a un archivo que no existe en el repo, inclúyelo igual (es lo que dice el proyecto) y avísalo en el reporte, porque el usuario querrá arreglarlo.

### 6. Datos faltantes

Si un dato **obligatorio** no se puede obtener (por ejemplo, el porqué del proyecto o el tipo de licencia sin `LICENSE`), deja `TODO(readme): qué falta` en el lugar exacto y repórtalo al usuario. Si falta un dato de una sección **condicional**, omite la sección. Un TODO visible es mejor que un dato inventado, porque se ve y se corrige.

## Modo Actualizar

1. **Localiza el README** y confirma la marca de la línea 1.
2. **Averigua qué cambió**: usa lo que el usuario cuente, `git diff`/`git status` o los archivos modificados en la conversación. Si no hay señal, compara el repo con las secciones (por ejemplo, variables de `.env.example` contra la tabla de Configuración).
3. **Mapea cambios a secciones:**

| Cambió… | Revisa estas secciones |
|---|---|
| dependencias, versión del runtime | `requirements`, `installation` |
| scripts o comandos | `usage`, `development`, `testing` |
| variables de entorno o configuración | `configuration` |
| carpetas o módulos nuevos/eliminados | `structure` |
| funcionalidad nueva o eliminada | `highlights`, `overview`, `usage` |
| primeras pruebas, primer CI, primera licencia | agrega `testing` / badge / `license` en su lugar de la plantilla |
| versión o estado del proyecto | badges, `roadmap` |
| nuevos colaboradores | `authors` |
| datos o datasets | `data` |

4. **Edita con cambios mínimos**: modifica solo las secciones afectadas, localizándolas por su comentario `<!-- section:id -->`. No reordenes, no reformules texto que sigue siendo correcto y no cambies el estilo de lo que no tocas.
5. **Respeta lo humano**: todo lo que esté entre `<!-- keep -->` y `<!-- /keep -->` no se toca. Si el texto escrito por una persona contradice el código, el código manda, pero menciónalo en el reporte.
6. **Si una funcionalidad se eliminó**, quita todas sus menciones (aspectos destacados, uso, estructura, configuración), no solo una.
7. **Si ahora aplica una sección condicional**, agrégala en su posición de la plantilla; si ya no aplica, elimínala completa.
8. **Aplica la verificación** de más abajo solo a lo que cambiaste, más la coherencia general (marca y orden).

## Modo Migrar

El README existe pero sigue otra estructura. Conserva toda la información factual y reorganízala.

1. Mapea cada bloque existente a una sección de la plantilla.
2. Lo que no encaje en ninguna sección va a `overview` o, si es contenido largo y valioso, a un bloque `<!-- keep -->` al final de la sección más cercana. No descartes nada con valor.
3. Conserva banners, logos y badges que ya estaban si siguen siendo válidos.
4. Agrega la marca de la línea 1 y los comentarios `section:`.
5. Completa solo lo que la evidencia respalde; lo demás, TODO u omisión según "Datos faltantes".
6. En el reporte, muestra el mapeo (qué bloque antiguo pasó a qué sección).

## Verificación antes de entregar

- La línea 1 es `<!-- readme-standard:v1 -->`.
- Las secciones incluidas tienen su comentario `section:` y están en el orden de la plantilla.
- No quedan encabezados vacíos ni texto de relleno; solo `TODO(readme):` donde falte un dato obligatorio.
- Cada comando existe en scripts, `Makefile`, documentación o es el estándar del gestor detectado.
- Cada ruta, imagen y enlace relativo apunta a algo que existe.
- No hay secretos ni valores reales de configuración.
- La primera pantalla responde: qué es, si sirve, cómo instalarlo/usarlo y quién lo hizo.

## Reporte al usuario

Al terminar, responde breve: qué modo usaste, qué secciones creaste/cambiaron/eliminaron, qué `TODO(readme)` quedaron, y cualquier contradicción entre README y código. Sin repetir el contenido del README.

## Para que los agentes lo apliquen solos (opcional)

Este bloque se puede pegar en el archivo de reglas del proyecto (por ejemplo `AGENTS.md` o `CLAUDE.md`), junto con una copia de este archivo:

```markdown
## Documentación
Cuando cambies dependencias, scripts, variables de entorno, estructura de carpetas o funcionalidades, aplica el estándar `readme-standard` en modo Actualizar sobre `README.md`. Edita solo las secciones afectadas; no reescribas el archivo.
```
