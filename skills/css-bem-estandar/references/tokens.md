# Design tokens y temas

## Índice

- [Principios](#principios)
- [Nomenclatura](#nomenclatura)
- [Catálogo mínimo](#catálogo-mínimo)
- [Primitivos y semánticos](#primitivos-y-semánticos)
- [Variables locales por bloque](#variables-locales-por-bloque)
- [Temas](#temas)
- [Script anti-parpadeo y selector de tema](#script-anti-parpadeo-y-selector-de-tema)
- [Contraste por tema](#contraste-por-tema)
- [Breakpoints](#breakpoints)
- [Proyectos con base 16px](#proyectos-con-base-16px)
- [Tailwind](#tailwind)

## Principios

- Nunca se hardcodean en componentes colores, tamaños, espaciados, sombras, radios, duraciones ni z-index: siempre `var(--...)`.
- Los tokens se definen **una vez**, en `:root`, en un solo archivo global (`tokens.css`, o `00-tokens/` en ITCSS).
- Nombres en **kebab-case** e inglés.
- `html { font-size: 62.5%; }`: 1rem = 10px. Todo en `rem`; nunca `px` en tipografía ni espaciado. Al ser un porcentaje, respeta el tamaño de letra que el usuario elija en el navegador. En `assets/tokens.css` el 62.5% se declara en el propio `:root` (que es `html`) porque los tokens en rem dependen de él.
- Excepciones razonables en px: `--border-width: 1px`, sombras y `--radius-full: 9999px`.
- `line-height` sin unidades.

## Nomenclatura

```
--{categoría}-{propiedad o rol}-{variante}-{estado}
```

| Categoría | Patrón | Ejemplos |
|---|---|---|
| Primitivo de color | `--{tono}-{escala}` | `--blue-600`, `--gray-50`, `--alpha-white-16` |
| Color semántico | `--color-{rol}[-{estado}]` | `--color-primary`, `--color-primary-hover`, `--color-on-primary` |
| Tipografía | `--font-{family,size,weight}-{variante}`, `--line-height-{variante}` | `--font-size-lg`, `--font-weight-bold` |
| Espaciado | `--space-{talla}` | `--space-md` |
| Iconos | `--icon-size-{talla}` | `--icon-size-md` |
| Bordes | `--border-width`, `--border`, `--radius-{talla}` | `--radius-md` |
| Sombras | `--shadow-{talla}` | `--shadow-lg` |
| Animación | `--transition-{velocidad}`, `--ease-{nombre}` | `--transition-fast`, `--ease-standard` |
| Capas | `--z-{uso}` | `--z-modal` |
| Layout | `--container-max`, `--header-height` | |
| Local de bloque | `--{bloque}-{propiedad}[-{estado}]` | `--btn-bg-hover`, `--card-padding` |

Tallas: `xs, sm, md, lg, xl` (y `2xl`, `3xl` si hacen falta). `on-*` es el color de texto sobre un fondo de ese rol.

## Catálogo mínimo

Todos están en `assets/tokens.css`.

### Color (semánticos)

| Token | Claro (por defecto) | Uso |
|---|---|---|
| `--color-primary` / `-hover` | `--blue-600` / `--blue-700` | acción principal, enlaces |
| `--color-on-primary` | `--white` | texto sobre primary |
| `--color-secondary` / `-hover` | `--violet-600` / `--violet-700` | acción secundaria |
| `--color-on-secondary` | `--white` | texto sobre secondary |
| `--color-bg` | `--gray-50` | fondo de página |
| `--color-surface` | `--white` | tarjetas, paneles |
| `--color-text` | `--gray-900` | texto principal |
| `--color-text-muted` | `--gray-600` | texto secundario |
| `--color-success` | `--green-700` | éxito |
| `--color-warning` | `--amber-800` | aviso |
| `--color-danger` | `--red-700` | error, destructivo |
| `--color-info` | `--sky-700` | información |
| `--color-border` | `--alpha-black-12` | bordes (en oscuro: `--alpha-white-16` = `oklch(100% 0 0 / 16%)`) |
| `--color-focus` | `--blue-600` | anillo de foco |

El valor de borde `oklch(100% 0 0 / 16%)` es blanco translúcido: funciona sobre fondos oscuros. Por eso
el tema claro usa su equivalente negro (`oklch(0% 0 0 / 12%)`) y el oscuro usa exactamente ese valor.

### Tipografía

| Token | Valor |
|---|---|
| `--font-family-base` | `system-ui, -apple-system, "Segoe UI", roboto, ...` |
| `--font-family-mono` | `ui-monospace, "SFMono-Regular", menlo, consolas, monospace` |
| `--font-size-xs` / `sm` / `md` / `lg` / `xl` | `1rem` / `1.4rem` / `1.6rem` / `1.8rem` / `2.4rem` |
| `--font-size-2xl` / `3xl` (fluidos) | `clamp(2.8rem, 2.2rem + 1.6vw, 3.6rem)` / `clamp(3.2rem, 2.4rem + 2.4vw, 4.8rem)` |
| `--font-weight-regular` / `medium` / `bold` | `400` / `500` / `700` |
| `--line-height-tight` / `base` / `loose` | `1.2` / `1.5` / `1.8` |

### Espaciado, iconos, bordes

| Token | Valor |
|---|---|
| `--space-xs` / `sm` / `md` / `lg` / `xl` / `2xl` | `0.4rem` / `0.8rem` / `1.6rem` / `2.4rem` / `3.2rem` / `4.8rem` |
| `--icon-size-sm` / `md` / `lg` | `1.6rem` / `2.2rem` / `3.2rem` |
| `--border-width` | `1px` |
| `--border` | `var(--border-width) solid var(--color-border)` |
| `--radius-sm` / `md` / `lg` / `full` | `0.4rem` / `1rem` / `1.6rem` / `9999px` |

### Sombras

| Token | Valor |
|---|---|
| `--shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px 0 rgb(0 0 0 / 6%)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -1px rgb(0 0 0 / 6%)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -2px rgb(0 0 0 / 5%)` |

`rgb(0 0 0 / 10%)` es la notación moderna de `rgba(0,0,0,.1)` (mismo color; es la que exige stylelint-config-standard).

### Animación, capas, layout, accesibilidad

| Token | Valor |
|---|---|
| `--transition-fast` / `base` / `slow` | `150ms` / `250ms` / `400ms` (0ms con `prefers-reduced-motion: reduce`) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--z-dropdown` / `sticky` / `modal` / `toast` | `100` / `200` / `300` / `400` |
| `--container-max` | `120rem` |
| `--container-padding` | `clamp(1.6rem, 4vw, 3.2rem)` |
| `--header-height` | `6.4rem` |
| `--tap-target-min` | `4.4rem` (objetivo táctil de 44px) |
| `--focus-ring-width` / `--focus-ring-offset` | `0.3rem` / `0.2rem` |
| `--focus-ring` | `var(--focus-ring-width) solid var(--color-focus)` |
| `--opacity-disabled` | `0.5` |

Los tokens compuestos (`--border`, `--focus-ring`) se resuelven en `<html>`: aplica `data-theme` en `<html>`
para que tomen los colores del tema.

## Primitivos y semánticos

```css
:root {
  /* Primitivo: qué color es */
  --blue-600: oklch(54.6% 0.245 263deg);

  /* Semántico: para qué sirve */
  --color-primary: var(--blue-600);
}

/* Componente: solo semánticos */
.btn {
  background-color: var(--color-primary);  /* bien */
  border-color: var(--blue-600);           /* mal: primitivo en un componente */
}
```

Los primitivos se escriben en `oklch()` (gama amplia y luminosidad perceptual, fácil de escalar).

## Variables locales por bloque

```css
.btn {
  --btn-bg: var(--color-primary);
  --btn-bg-hover: var(--color-primary-hover);

  background-color: var(--btn-bg);
}

.btn:hover {
  background-color: var(--btn-bg-hover);
}

.btn--secondary {
  --btn-bg: var(--color-secondary);
  --btn-bg-hover: var(--color-secondary-hover);
}
```

El modificador no repite propiedades: solo reasigna variables. Ver `assets/button.css`.

## Temas

Regla de oro: **un tema solo redefine tokens semánticos**. Los componentes no saben que existen temas
y nunca se duplican reglas de componentes por tema. Archivo completo: `assets/themes.css` (cárgalo
después de `tokens.css`).

### Modelo A: claro / oscuro

Sigue la preferencia del sistema salvo que el usuario elija explícitamente.

```css
/* tokens.css: el claro es el valor por defecto de :root */

/* Oscuro automático: solo si el usuario no fijó data-theme */
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme])) {
    color-scheme: dark;

    --color-bg: var(--gray-950);
    --color-text: var(--gray-50);
    /* ...resto de semánticos */
  }
}

/* Oscuro elegido por el usuario */
[data-theme="dark"] {
  color-scheme: dark;

  --color-bg: var(--gray-950);
  --color-text: var(--gray-50);
}

/* data-theme="light" usa los valores por defecto: no necesita regla */
```

- `:where()` mantiene la especificidad en 0-1-0.
- `color-scheme` adapta controles nativos y barras de scroll.
- Repetir los **valores de tokens** en el bloque `@media` y en `[data-theme="dark"]` es aceptable (no son reglas de componentes).
- Alternativa sin repetición en navegadores modernos (2024+): `light-dark()`.

```css
:root {
  color-scheme: light dark;

  --color-bg: light-dark(var(--gray-50), var(--gray-950));
  --color-text: light-dark(var(--gray-900), var(--gray-50));
}

[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

### Modelo B: paletas seleccionables

N temas con nombre, sin noción de claro/oscuro, elegidos por el usuario:

```css
[data-theme="ocean"] {
  --color-primary: var(--teal-700);
  --color-primary-hover: var(--teal-800);
  --color-bg: var(--teal-50);
  --color-focus: var(--teal-700);
}

[data-theme="grape"] {
  --color-primary: var(--violet-700);
  --color-primary-hover: var(--violet-800);
  --color-bg: var(--violet-50);
  --color-focus: var(--violet-700);
}
```

- El atributo va en `<html>`: `<html data-theme="ocean">`.
- Se persiste en `localStorage` y se aplica con el script inline antes del primer pintado.
- Una paleta puede ser oscura: en ese caso añade `color-scheme: dark;` dentro de su bloque.
- Para añadir una paleta: crea los primitivos que falten, un bloque `[data-theme="nombre"]` con los semánticos y verifica su contraste.

Ambos modelos pueden convivir (en `assets/themes.css` lo hacen), pero lo normal es que el proyecto use uno.

## Script anti-parpadeo y selector de tema

Script **inline, mínimo y bloqueante** en `<head>`, antes de cualquier CSS que pinte el `body`:

```html
<script>
  try {
    const theme = localStorage.getItem('theme');
    if (theme) document.documentElement.dataset.theme = theme;
  } catch {}
</script>
```

- Astro: `<script is:inline>` en el layout (un `<script>` normal se empaqueta y llega tarde).
- Next (App Router): `<script dangerouslySetInnerHTML={{ __html: themeScript }} />` en `<head>` de `app/layout.tsx` y `suppressHydrationWarning` en `<html>`.
- SvelteKit: en `src/app.html`. Vue/Vite y Angular: en `index.html`.
- `try/catch` porque `localStorage` puede fallar (modo privado, bloqueos).

Selector (fuera del `<head>`, puede ir en el bundle):

```js
const THEMES = ['light', 'dark', 'ocean', 'grape'];

export function setTheme(name) {
  if (!THEMES.includes(name)) return;
  document.documentElement.dataset.theme = name;
  try { localStorage.setItem('theme', name); } catch {}
}

// Modelo A: volver a seguir al sistema
export function clearTheme() {
  delete document.documentElement.dataset.theme;
  try { localStorage.removeItem('theme'); } catch {}
}
```

```html
<label for="theme-select">Tema</label>
<select id="theme-select" class="theme-picker js-theme-select">
  <option value="light">Claro</option>
  <option value="dark">Oscuro</option>
  <option value="ocean">Océano</option>
  <option value="grape">Uva</option>
</select>
```

## Contraste por tema

WCAG 2.2 AA, **en cada tema**:

| Par | Mínimo |
|---|---|
| Texto normal sobre su fondo (`text`/`bg`, `text`/`surface`, `text-muted`/`surface`) | 4.5:1 |
| Texto grande (≥ 2.4rem, o ≥ 1.9rem en negrita) | 3:1 |
| `on-primary`/`primary` (y sus `-hover`), `on-secondary`/`secondary` | 4.5:1 |
| Enlaces (`primary`) y colores de estado como texto sobre `surface` y `bg` | 4.5:1 |
| Anillo de foco y bordes de controles frente al fondo | 3:1 |

Cómo verificarlo: calcula la luminancia relativa de cada par (DevTools muestra el ratio en el selector
de color; también sirven herramientas como el checker de WebAIM). `oklch()` se convierte a sRGB antes de
calcular. La paleta de `assets/themes.css` ya está verificada (claro, oscuro, ocean y grape cumplen todos
los pares de la tabla); si cambias un primitivo, vuelve a comprobarlo.

`--color-border` es decorativo (separadores). Los bordes que identifican un control (inputs) deben llegar a 3:1:
usa un token propio, p. ej. `--color-border-strong`.

## Breakpoints

Las media queries no aceptan `var()`. Documenta los breakpoints en la cabecera de `tokens.css` y de
cada archivo que los use, y escríbelos **idénticos** en todo el proyecto:

```css
/* Breakpoints: tablet 768px, desktop 1024px, wide 1280px (mobile-first, min-width) */
@media (min-width: 768px) { }
@media (min-width: 1024px) { }
```

Con PostCSS se puede usar `@custom-media --tablet (min-width: 768px);` (postcss-custom-media) para no repetir valores.

## Proyectos con base 16px

Si el proyecto ya usa `html { font-size: 100%; }` (1rem = 16px), **se respeta** y se recalculan los tokens
dividiendo entre 16 en vez de entre 10:

| px | rem con 62.5% | rem con 16px |
|---|---|---|
| 4 | 0.4rem | 0.25rem |
| 8 | 0.8rem | 0.5rem |
| 14 | 1.4rem | 0.875rem |
| 16 | 1.6rem | 1rem |
| 18 | 1.8rem | 1.125rem |
| 22 | 2.2rem | 1.375rem |
| 24 | 2.4rem | 1.5rem |
| 32 | 3.2rem | 2rem |

No mezcles las dos bases en el mismo proyecto.

## Tailwind

En Tailwind v4, los tokens van en `@theme` (generan utilidades y variables a la vez):

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(54.6% 0.245 263deg);
  --color-surface: oklch(100% 0 0deg);
  --radius-md: 0.625rem;
}
```

Los temas siguen redefiniendo solo semánticos en `[data-theme="..."]`. En v3: variables en `:root` y
`theme.extend.colors.primary = 'var(--color-primary)'`.
