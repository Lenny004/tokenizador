# Reglas BEM

Base: la guía de Arsys sobre BEM (https://www.arsys.es/blog/bem-guia-completa-para-css-modular-con-ejemplos) y la metodología oficial (https://en.bem.info/methodology/).

## Índice

- [Nomenclatura](#nomenclatura)
- [Reglas](#reglas)
- [Modificadores con variables locales](#modificadores-con-variables-locales)
- [Estados y hooks de JS](#estados-y-hooks-de-js)
- [Mixes](#mixes)
- [Orden de propiedades](#orden-de-propiedades)
- [Adaptaciones por stack](#adaptaciones-por-stack)
- [Ejemplo de refactor](#ejemplo-de-refactor)
- [Cómo nombrar](#cómo-nombrar)

## Nomenclatura

| Pieza | Forma | Ejemplo |
|---|---|---|
| Bloque | `.block` | `.card`, `.site-header` |
| Elemento | `.block__element` | `.card__title`, `.site-header__logo` |
| Modificador de bloque | `.block--modifier` | `.card--featured`, `.btn--lg` |
| Modificador de elemento | `.block__element--modifier` | `.card__price--sale` |
| Estado (lo pone JS) | `.is-*`, `.has-*` | `.is-open`, `.has-error` |
| Hook de JS (sin estilos) | `.js-*` | `.js-menu-toggle` |

Todo en **minúsculas kebab-case** e inglés. Expresión regular (la misma de `.stylelintrc.json`):

```
^(?!js-)(?:(?:is|has)-[a-z0-9]+(?:-[a-z0-9]+)*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?)$
```

## Reglas

### 1. Nunca anidar elementos

El elemento pertenece al bloque, no a otro elemento. La estructura del DOM no se copia en el nombre.

```css
/* MAL */
.card__body__title { }
.card__footer__button__icon { }

/* BIEN */
.card__title { }
.card__icon { }
```

Si un elemento crece tanto que tiene sus propios elementos, probablemente es **otro bloque**
(`.card__footer` pasa a ser `.card-footer` o un bloque reutilizable como `.toolbar`).

### 2. Bloque independiente y reutilizable

El bloque no depende de dónde se coloca. Nada de márgenes externos ni posicionamiento ligado al contexto
dentro del propio bloque; eso lo pone el padre mediante un mix.

```css
/* MAL: la card solo funciona dentro de .sidebar */
.sidebar .card { margin-block-start: 2rem; }

/* BIEN: el layout coloca, el bloque se pinta */
.sidebar__item { margin-block-start: var(--space-lg); }
```

```html
<div class="card sidebar__item">...</div>
```

### 3. Sin etiquetas, IDs ni descendientes largos en componentes

```css
/* MAL */
#main-nav { }
.nav ul li a { }
.card h3 { }
a.btn { }

/* BIEN */
.nav { }
.nav__link { }
.card__title { }
.btn { }
```

Las etiquetas solo se estilizan en `reset.css` y `base.css`.

### 4. Especificidad máxima 0-1-0

Una sola clase por selector. Prohibido `#id`, `!important` y clases encadenadas (`.a.b`).
Excepciones permitidas (no suben la especificidad efectiva en la auditoría):

- pseudo-clases de estado o estructurales: `.btn:hover`, `.btn:focus-visible`, `.btn:disabled`, `.list__item:first-child`;
- pseudo-elementos: `.btn::before`;
- atributos ARIA o de estado: `.btn[aria-pressed="true"]`, `.tabs__tab[aria-selected="true"]`;
- clases de estado: `.menu.is-open`, `.field.has-error`;
- `:where(...)` (especificidad 0), útil en reset y base.

```css
/* MAL */
.card.featured { }               /* encadenada */
.header .nav .nav__link { }      /* 0-3-0 */
.btn { color: red !important; }

/* BIEN */
.card--featured { }
.nav__link { }
.btn--danger { --btn-bg: var(--color-danger); }
```

### 5. Modificador junto a la clase base

El modificador **nunca** va solo: complementa al bloque.

```html
<!-- MAL -->
<button class="btn--primary">Enviar</button>

<!-- BIEN -->
<button class="btn btn--primary">Enviar</button>
```

### 6. Un bloque, un único dueño

Cada bloque vive en un solo archivo. Si otro archivo necesita variarlo, se crea un modificador en el
archivo del bloque o se le da valor a una variable local desde fuera.

## Modificadores con variables locales

El bloque declara variables locales con valor por defecto (tomado de los tokens semánticos). Los
modificadores y estados **solo cambian esas variables**; así no se repiten reglas y la especificidad
se queda en 0-1-0 incluso cuando el modificador afecta a un elemento.

```css
.card {
  --card-padding: var(--space-md);
  --card-title-color: var(--color-text);

  padding: var(--card-padding);
}

.card__title {
  color: var(--card-title-color);
}

/* El modificador del bloque cambia al elemento sin .card--featured .card__title */
.card--featured {
  --card-padding: var(--space-lg);
  --card-title-color: var(--color-primary);
}
```

Nombre de las variables locales: `--{bloque}-{propiedad}[-{variante}]` (`--btn-bg`, `--btn-bg-hover`,
`--card-padding`).

## Estados y hooks de JS

- Estados que añade JS: `is-*` (`is-open`, `is-active`, `is-loading`) y `has-*` (`has-error`, `has-icon`). Siempre **encadenados** al bloque o elemento que afectan (`.menu__panel.is-open`), nunca sueltos como utilidad global.
- Si existe un atributo ARIA equivalente, úsalo como fuente de verdad: `[aria-expanded="true"]`, `[aria-current="page"]`, `[aria-invalid="true"]`, `[aria-disabled="true"]`.
- Hooks para JS: `js-*`, **sin estilos jamás**. Así se puede cambiar el diseño sin romper el JS y viceversa.

```html
<button class="navbar__toggle js-navbar-toggle" aria-expanded="false" aria-controls="main-menu">Menú</button>
<nav class="navbar__menu" id="main-menu">...</nav>
```

```css
.navbar__menu { display: none; }
.navbar__menu.is-open { display: block; }
```

Estados completos de un control interactivo: `:hover`, `:focus-visible`, `:active`, `:disabled` y
`[aria-*]` cuando aplique. El foco visible global vive en `base.css`.

## Mixes

Un mix pone dos clases de bloques distintos en el mismo nodo. Úsalo **solo** para separar layout
(posición, rejilla, márgenes externos) de componente (aspecto):

```html
<li class="card grid__item">...</li>
<a class="btn card__action" href="/comprar">Comprar</a>
```

- `grid__item` coloca; `card` pinta.
- `card__action` (de la card) solo añade colocación (`margin-block-start: auto`); el aspecto es de `btn`.
- No uses mixes para combinar dos aspectos (`class="btn card"` está mal).

## Orden de propiedades

1. **Posicionamiento**: `position`, `inset*`, `z-index`.
2. **Display/layout**: `display`, `flex*`, `grid*`, `gap`, `align-*`, `justify-*`, `order`.
3. **Box model**: `inline-size`, `block-size`, `min/max-*`, `aspect-ratio`, `padding*`, `margin*`, `overflow`, `border*`, `border-radius`.
4. **Tipografía**: `font*`, `line-height`, `letter-spacing`, `text-*`, `color`, `white-space`.
5. **Visual**: `background*`, `box-shadow`, `opacity`, `outline`, `cursor`, `filter`.
6. **Animación**: `transform`, `transition`, `animation`.

Variables locales al principio del bloque, separadas por una línea en blanco.

## Adaptaciones por stack

### CSS Modules (Next/React)

El archivo es el bloque, así que no se repite el prefijo:

| BEM global | CSS Modules |
|---|---|
| `.card` | `.card` (o `.root`) |
| `.card__title` | `.title` |
| `.card__price--sale` | `.priceSale` o `.price-sale` |
| `.card--featured` | `.featured` (aplicado con `clsx`) |

Mantén la convención que ya use el proyecto. Las reglas de especificidad, tokens y limpieza son las mismas.

### Angular

- `:host` es la raíz del bloque; el host lleva la clase del bloque (`host: { class: 'card' }`).
- Modificador: `:host(.card--featured) { --card-border-color: var(--color-primary); }`.
- Elementos con BEM completo: `.card__title`.
- Sin `::ng-deep`: expón variables CSS en el hijo.

### Astro / Svelte / Vue scoped

- BEM completo dentro del `<style>` aunque el framework aísle: `.card`, `.card__title`, `.card--featured`.
- `:global()` solo en el layout o el CSS global, nunca para estilizar otro bloque.

## Ejemplo de refactor

Antes («limpia este CSS»):

```css
#header { background: #fff; }
.card .title { font-size: 18px; color: #333 !important; }
.card .title .text { font-size: 14px; color: #777; }
.card.featured { border: 1px solid #0d6efd; transition: all .3s; }
```

Después:

```css
@layer components {
  .site-header {
    background-color: var(--color-surface);
  }

  .card {
    --card-border-color: var(--color-border);

    border: var(--border-width) solid var(--card-border-color);
    transition: background-color var(--transition-base) var(--ease-standard);
  }

  .card__title {
    font-size: var(--font-size-lg);
    color: var(--color-text);
  }

  .card__text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .card--featured {
    --card-border-color: var(--color-primary);
  }
}
```

Mapa para el HTML:

| Antes | Después |
|---|---|
| `id="header"` | `class="site-header"` |
| `.card .title` | `.card__title` |
| `.card .title .text` | `.card__text` (hermano, no hijo del título) |
| `class="card featured"` | `class="card card--featured"` |

Qué se resolvió: ID → clase, `!important` eliminado (ya no hace falta con 0-1-0), hex → tokens,
px → rem vía tokens, `transition: all` → propiedad concreta, clase encadenada → modificador.

## Cómo nombrar

- Bloques por **qué son**, no por cómo se ven: `.alert`, no `.red-box`; `.product-card`, no `.left-col`.
- Modificadores por variante o estado semántico: `--featured`, `--danger`, `--compact`, `--lg`.
- Elementos por su papel: `__title`, `__media`, `__body`, `__actions`, `__icon`.
- Nombres de bloque compuestos con guion simple: `.site-header`, `.price-tag`.
