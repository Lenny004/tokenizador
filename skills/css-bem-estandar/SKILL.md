---
name: css-bem-estandar
description: >-
  Úsala SIEMPRE que el usuario pida crear, escribir, mejorar, ordenar, limpiar,
  refactorizar, auditar o revisar CSS, estilos, una hoja de estilos, un sistema
  de diseño, variables CSS o design tokens, temas (claro/oscuro o paletas
  seleccionables), o cuando mencione BEM, clases, nombres de clases o
  componentes visuales (tarjetas, botones, navbar, formularios, layouts), aunque
  no diga «BEM». Aplica a HTML/CSS puro, React/Next (CSS Modules), Vue, Angular,
  Astro y Svelte siempre que haya CSS de por medio. Con ella el CSS sale en BEM
  con tokens, sin !important, IDs, valores mágicos ni código muerto, con una
  estructura de archivos adaptada al proyecto y auditado con checklist y script.
---
# CSS BEM estándar

Escribe, refactoriza y audita CSS limpio con **BEM + design tokens**, adaptando la estructura de
archivos al proyecto. Responde siempre en español; los nombres de clases y variables van en inglés
(`.card__title`, `--color-primary`).

Los archivos de apoyo (`references/`, `assets/`, `scripts/`) están en la carpeta de esta skill: `/home/box/agent-data/workflows/css-bem-estandar/`. Usa rutas completas a esa carpeta.

Qué cubre:

- **Generar** CSS nuevo (componentes, layouts, páginas) con BEM y tokens.
- **Refactorizar** CSS existente: quitar basura, duplicados, `!important`, IDs y valores mágicos; pasar a BEM con variables.
- **Auditar** CSS y reportar violaciones con la checklist y `scripts/audit_css.py`.
- **Organizar** archivos con la estructura que encaje con el stack.

## Flujo de trabajo

Sigue siempre estos cinco pasos, en orden:

```
1. Detectar proyecto → 2. Elegir estructura → 3. Definir tokens → 4. Escribir bloques BEM → 5. Auditar
```

### 1. Detectar el proyecto

Antes de escribir una línea, mira qué hay:

- **Stack**: `package.json` (`next`, `react`, `@angular/core`, `vue`, `astro`, `svelte`, `tailwindcss`), `angular.json`, `astro.config.*`, `svelte.config.*`, archivos `.vue`/`.astro`/`.svelte`.
- **CSS existente**: dónde vive (`styles/`, `src/styles/`, `app/globals.css`, `*.module.css`, `*.component.css`, `<style scoped>`), si hay `mobile.css`/`tablet.css`/`desktop.css`, si usa `@layer`.
- **Convenciones ya presentes**: nombres de clases (BEM, camelCase en CSS Modules, utilidades), tokens existentes (`:root`, `@theme`, `variables.css`), base tipográfica (62.5% o 16px), breakpoints, temas.
- **Herramientas**: stylelint, Prettier, PostCSS/Autoprefixer o Lightning CSS (decide si `@layer` y el CSS moderno son viables).

Si el proyecto ya tiene convención, **se respeta** y se mejora dentro de ella.

### 2. Elegir la estructura

Tres reglas:

1. **Respetar lo existente**: mejora dentro de la estructura actual; no reorganices salvo que te lo pidan.
2. **Proyecto nuevo**: elige por stack con la tabla y **dilo en una línea**: cuál y por qué.
   Ejemplo: «Estructura: estática simple (styles/ + un archivo por bloque), porque son 3 páginas sin framework».
3. **Si dudas, pregunta** antes de crear archivos.

| Proyecto | Estructura | Plantilla |
|---|---|---|
| HTML/CSS puro, pequeño (landing, pocas páginas) | `styles/` con `tokens.css`, `reset.css`, `base.css`, `components/` (un archivo por bloque) y `main.css` con `@layer` + `@import` | `assets/structures/static/` |
| Grande, multi-tema o design system | ITCSS: `00-tokens/ → 01-base/ → 02-layout/ → 03-components/ → 04-utilities/` | ver `references/structures.md` |
| Next / React con CSS Modules | `app/globals.css` (tokens + reset + base) y `Componente.module.css` junto a cada componente; BEM adaptado | `assets/structures/nextjs/` |
| Angular | `src/styles/` global + un `.css` por componente; componente = bloque, `:host` = raíz | `assets/structures/angular/` |
| Vue SFC | `<style scoped>` en cada componente + `assets/styles/` global | ver `references/structures.md` |
| **Astro / Svelte** | tokens + reset + base globales en `src/styles/`, importados **una vez** en el layout; cada componente con su `<style>` scoped y BEM completo (`.card`, `.card__title`, `.card--featured`); `:global()` solo en layout/global | `assets/structures/astro/` |
| Por tamaños (`mobile/tablet/desktop.css`) | `base.css` mobile-first sin media queries + un archivo por breakpoint con `@media (min-width)` solo con lo mínimo; mismos breakpoints en todos | `assets/structures/by-breakpoint/` |
| Tailwind | CSS propio solo para lo que las utilidades no cubren; tokens en `@theme`/`:root`; no mezcles BEM y utilidades en el mismo elemento sin motivo | ver `references/structures.md` |

Invariantes en cualquier estructura: tokens en **un** lugar global, reset **una** vez, **un dueño por
bloque**, cero duplicados, código muerto, `!important` e IDs.

Lee `references/structures.md` cuando vayas a crear o reorganizar archivos: tiene los árboles completos
por stack (incluidos Astro, Svelte, Vue, ITCSS y Tailwind) y cómo encajan las capas.

### 3. Definir los tokens

- Todo valor de diseño sale de un token: colores, tamaños, espaciado, sombras, radios, duraciones, z-index. En componentes **siempre** `var(--...)`.
- Se definen **una vez** en `:root`, en kebab-case e inglés. Parte de `assets/tokens.css` (incluye el mínimo obligatorio) y ajusta los valores a la marca.
- **Dos niveles**: primitivos (`--blue-600`) y semánticos (`--color-primary: var(--blue-600)`). Los componentes usan **solo semánticos**.
- `html { font-size: 62.5%; }` (1rem = 10px) y todo en `rem`; nunca `px` en tipografía ni espaciado. Si el proyecto ya usa base 16px, respétala y recalcula (1.6rem pasa a 1rem).
- **Temas**: solo redefinen tokens semánticos. Dos modelos, ambos en `assets/themes.css`:
  - A) claro/oscuro con `prefers-color-scheme` + `[data-theme="dark"]`;
  - B) N paletas seleccionables con `[data-theme="nombre"]` en `<html>`, persistidas en `localStorage` y aplicadas con un script inline mínimo en `<head>` antes del primer pintado.
  Nunca dupliques reglas de componentes por tema.
- **Variables locales por bloque** (`--btn-bg`, `--card-padding`) para que los modificadores solo cambien variables.
- Las media queries no aceptan `var()`: documenta los breakpoints en un comentario y úsalos idénticos en todo el proyecto (mobile-first, `min-width`).

Lee `references/tokens.md` para el catálogo completo, la nomenclatura, los dos modelos de temas con el
script anti-parpadeo y la verificación de contraste por tema.

### 4. Escribir los bloques BEM

Reglas duras (detalle y ejemplos en `references/bem.md`):

- `.block`, `.block__element`, `.block--modifier`, `.block__element--modifier`; minúsculas kebab-case.
- **Nunca** anidar elementos: `.card__body__title` está prohibido, se escribe `.card__title`.
- El bloque es independiente y reutilizable: no depende de dónde se coloque.
- Sin selectores por etiqueta, ID ni descendientes largos en componentes.
- **Especificidad máxima 0-1-0**: prohibidos `#id`, `!important` y clases encadenadas (`.a.b`), salvo pseudo-clases de estado (`:hover`, `:focus-visible`, `:disabled`) y estados `is-`/`has-`.
- Modificador junto a la clase base en el HTML: `class="btn btn--primary"`.
- Estados que pone JS: `is-open`, `has-error`. Hooks de JS: `js-*`, **sin estilos**.
- Mixes solo para separar layout de componente: `class="card grid__item"`.
- Un bloque, un único dueño (un archivo).

Mejoras obligatorias en todo CSS que entregues:

1. **Reset moderno** (`assets/reset.css`): border-box, márgenes 0, medios `max-inline-size: 100%` y `display: block`, controles con `font: inherit`.
2. **Accesibilidad**: `:focus-visible` con outline visible, contraste WCAG AA **en cada tema**, `prefers-reduced-motion`, `.sr-only`.
3. **Mobile-first** con unidades relativas (`rem`, `%`, `fr`, `clamp()`, `dvh`); sin anchos fijos en px.
4. **Propiedades lógicas** (`margin-inline`, `padding-block`, `inline-size`, `inset-block-start`).
5. **Temas solo con tokens**.
6. **Tipografía fluida** con `clamp()`; `line-height` sin unidades.
7. **`@layer`** (`reset, tokens, base, layout, components, utilities`) si el entorno lo soporta; cero `!important`, IDs y estilos inline.
8. **Sin basura**: código muerto, duplicados, propiedades que se anulan, código comentado, prefijos `-webkit-` manuales, selectores `*` pesados.
9. **Sin valores mágicos**: un número repetido más de una vez se convierte en token o variable local.
10. **Transiciones** solo de `opacity`, `transform`, `color`, `background-color`; prohibido `transition: all`.
11. **Orden de propiedades**: posicionamiento → display/layout → box model → tipografía → visual → animación.
12. **Shorthand** cuando sea más claro.
13. **Cabecera breve** por archivo; comentarios solo del «por qué».
14. **Estados completos**: `:hover`, `:focus-visible`, `:active`, `:disabled`, `[aria-*]`.
15. **`@media print`** mínimo si aplica.
16. **stylelint** con `stylelint-config-standard` + `selector-class-pattern` BEM (`assets/.stylelintrc.json`) y Prettier para el formato.

Esqueleto de bloque (modelo completo en `assets/button.css`):

```css
/* Bloque card: tarjeta de producto. Los modificadores solo cambian variables locales. */
@layer components {
  .card {
    --card-padding: var(--space-md);
    --card-border-color: var(--color-border);

    display: flex;
    flex-direction: column;
    padding: var(--card-padding);
    border: var(--border-width) solid var(--card-border-color);
    border-radius: var(--radius-lg);
    color: var(--color-text);
    background-color: var(--color-surface);
  }

  .card__title {
    font-size: var(--font-size-lg);
    line-height: var(--line-height-tight);
  }

  .card--featured {
    --card-border-color: var(--color-primary);
  }
}
```

Adaptaciones por stack:

- **CSS Modules**: el archivo es el bloque; clases cortas (`.card`, `.title`, `.featured`) o camelCase; modificadores con `clsx`. Mantén la convención que ya tenga el proyecto.
- **Angular**: `:host` es la raíz del bloque; modificadores con `:host(.card--featured)`.
- **Astro / Svelte / Vue scoped**: BEM completo dentro del `<style>`; `:global()` solo en el layout o en CSS global, nunca para estilizar otro bloque.

### 5. Auditar

1. Ejecuta el auditor sobre lo que hayas escrito o vayas a revisar (`scripts/audit_css.py` está dentro
   de la carpeta de esta skill: usa su ruta completa; solo necesita Python 3, sin dependencias):

   ```bash
   python3 scripts/audit_css.py src/            # modo auto: infiere por archivo
   python3 scripts/audit_css.py styles/ --mode global
   python3 scripts/audit_css.py components/ --mode module    # CSS Modules
   python3 scripts/audit_css.py src/app --mode angular       # permite :host
   python3 scripts/audit_css.py src/ --mode scoped           # .astro/.svelte/.vue
   python3 scripts/audit_css.py src/ --json                  # salida para máquinas
   ```

   Detecta `!important`, `#id`, colores hardcodeados (hex, rgb, hsl, oklch, nombres) fuera de los
   archivos de tokens/temas, px en tipografía, `transition: all`, clases que no cumplen BEM, elementos
   anidados, selectores de más de 3 niveles, especificidad > 0-1-0 y, como avisos, valores mágicos,
   propiedades físicas, duplicados y código comentado. Sale con código 1 si hay errores
   (`--strict` hace que también fallen los avisos).
2. Corrige **todos los errores** y revisa los avisos (justifica los que dejes).
3. Repasa los puntos manuales de `references/checklist.md` (contraste por tema, orden de propiedades, estados completos, código muerto respecto al HTML).
4. Si el proyecto usa stylelint, copia `assets/.stylelintrc.json` y ejecuta `npx stylelint "**/*.css"`.

## Refactorizar CSS existente

1. **Audita primero** con `scripts/audit_css.py` para tener la lista de problemas.
2. **Inventario**: qué bloques hay de verdad (agrupa reglas por componente visual) y qué valores se repiten (serán tokens).
3. **Renombra a BEM**: un bloque por componente; `.card .title .text` pasa a `.card__title` y `.card__text`. Prepara la tabla «clase antigua → clase nueva» porque el HTML también cambia.
4. **Tokeniza**: colores, tamaños, radios, sombras y duraciones a `var(--...)`; px a rem.
5. **Limpia**: borra `!important` (resuelve la especificidad), IDs, duplicados, propiedades que se anulan, código comentado y prefijos manuales.
6. **Reaudita** hasta 0 errores.
7. **Informa**: cambios hechos, mapa de clases para el HTML y lo que no se pudo resolver sin ver el HTML o el JS.

## Formato de la respuesta

- Una línea con la estructura elegida y por qué (o «respeto la estructura existente»).
- El CSS por archivo, con su ruta, y el HTML/JSX de uso si cambia o es nuevo.
- Resultado de la auditoría (errores y avisos restantes) y la nota de contraste por tema si hay temas.
- Para refactors: el mapa «antes → después» de clases.

## Recursos

Lee cada referencia solo cuando el paso lo requiera:

| Archivo | Cuándo leerlo |
|---|---|
| `references/structures.md` | Paso 2: crear o reorganizar archivos; árboles por stack (static, ITCSS, Next, Angular, Vue, Astro, Svelte, por tamaños, Tailwind) y capas. |
| `references/bem.md` | Paso 4: dudas de nomenclatura, mixes, estados, modificadores con variables locales, adaptación a CSS Modules/Angular/scoped, ejemplo de refactor. |
| `references/tokens.md` | Paso 3: catálogo de tokens, nomenclatura, temas claro/oscuro y paletas, script anti-parpadeo, contraste, base 16px, Tailwind. |
| `references/checklist.md` | Paso 5 y cualquier revisión: checklist completa, qué detecta el script y qué es manual, formato del informe. |

Assets listos para copiar:

| Asset | Uso |
|---|---|
| `assets/tokens.css` | Primitivos + semánticos con todos los tokens mínimos y base 62.5%. |
| `assets/themes.css` | Modelo A (claro/oscuro) y modelo B (paletas `data-theme`), contraste AA verificado. |
| `assets/reset.css` | Reset moderno en `@layer reset`. |
| `assets/button.css` | Bloque de ejemplo completo: variables locales, modificadores, estados. |
| `assets/.stylelintrc.json` | stylelint-config-standard + patrón BEM, sin IDs, sin `!important`, especificidad 0-1-0. |
| `assets/structures/<stack>/` | Plantillas mínimas: `static`, `nextjs`, `angular`, `by-breakpoint`, `astro`. |

## Errores frecuentes a evitar

- Crear una carpeta ITCSS para un sitio de 3 páginas (usa la estructura estática simple).
- Reorganizar los archivos de un proyecto existente sin que lo pidan.
- `.card--featured .card__title { ... }`: mejor que el modificador cambie una variable local que lee el elemento.
- Duplicar reglas de componentes dentro de `[data-theme="dark"]`: los temas solo tocan tokens.
- `:global(.otro-bloque)` desde un componente scoped para «arreglar» otro bloque.
- Tokens primitivos (`--blue-600`) usados directamente en un componente.
- Olvidar comprobar el contraste del tema oscuro y de cada paleta.
