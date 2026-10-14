# Estructuras de archivos por stack

La estructura se adapta al proyecto. Tres reglas, siempre en este orden:

1. **Respetar lo existente.** Si el proyecto ya tiene estructura, se mejora dentro de ella. No se reorganiza salvo petición explícita.
2. **Proyecto nuevo:** elige por stack con la tabla y dilo en **una línea** (cuál y por qué).
3. **Duda:** pregunta antes de crear archivos.

## Índice

- [Tabla de decisión](#tabla-de-decisión)
- [Capas (@layer)](#capas-layer)
- [HTML/CSS puro pequeño](#htmlcss-puro-pequeño)
- [ITCSS (grande, multi-tema, design system)](#itcss-grande-multi-tema-design-system)
- [Next / React con CSS Modules](#next--react-con-css-modules)
- [Angular](#angular)
- [Vue SFC](#vue-sfc)
- [Astro](#astro)
- [Svelte / SvelteKit](#svelte--sveltekit)
- [Por tamaños (mobile / tablet / desktop)](#por-tamaños-mobile--tablet--desktop)
- [Tailwind](#tailwind)
- [Invariantes](#invariantes)

## Tabla de decisión

| Señal en el proyecto | Estructura | Plantilla |
|---|---|---|
| Sin framework, pocas páginas | Estática simple | `assets/structures/static/` |
| Muchos componentes, varios temas o design system compartido | ITCSS | árbol en esta guía |
| `next` o React con `*.module.css` | CSS Modules | `assets/structures/nextjs/` |
| `@angular/core`, `angular.json` | Angular | `assets/structures/angular/` |
| Archivos `.vue` | Vue SFC | árbol en esta guía |
| `astro` / `.astro` | Astro | `assets/structures/astro/` |
| `svelte` / `.svelte` | Svelte | árbol en esta guía (igual que Astro) |
| Ya existen `mobile.css` / `tablet.css` / `desktop.css` | Por tamaños | `assets/structures/by-breakpoint/` |
| `tailwindcss` | Tailwind + CSS propio mínimo | árbol en esta guía |

Frase tipo para el usuario: «Estructura: Astro con estilos globales en `src/styles/` y `<style>` scoped por componente, porque es lo idiomático en Astro y evita colisiones de clases».

## Capas (@layer)

Orden único para todo el proyecto:

```css
@layer reset, tokens, base, layout, components, utilities;
```

- La declaración de orden va **primero** (antes de los `@import`) en el punto de entrada.
- Cada archivo envuelve su contenido en su capa (`@layer components { ... }`). Así funciona igual con `<link>`, con `@import` o con un bundler, y no depende de que la herramienta soporte `@import ... layer()`.
- Los estilos **sin capa** ganan a todos los que tienen capa. En CSS Modules, Angular y `<style>` scoped los estilos de componente suelen ir sin capa: es lo deseado (el componente manda sobre base). Si además usas una capa `utilities` que deba ganar al componente, envuelve también el CSS del componente en `@layer components`.
- Si el entorno no soporta `@layer` (navegadores muy antiguos sin build), quítalo y controla el orden de carga: reset → tokens → base → layout → components → utilities.

## HTML/CSS puro pequeño

Para landings y sitios de pocas páginas. **No uses ITCSS aquí.**

```
index.html
about.html
styles/
├── main.css            # solo @layer + @import
├── reset.css
├── tokens.css          # (+ themes.css si hay temas)
├── base.css            # elementos HTML, foco, .sr-only
├── layout.css          # .container, .grid (objetos sin estética)
└── components/
    ├── button.css      # un archivo por bloque
    ├── card.css
    └── navbar.css
```

`main.css`:

```css
@layer reset, tokens, base, layout, components, utilities;

@import url("reset.css");
@import url("tokens.css");
@import url("base.css");
@import url("layout.css");
@import url("components/button.css");
@import url("components/card.css");
```

En producción conviene concatenar (Lightning CSS, PostCSS, esbuild) para no encadenar peticiones `@import`.

## ITCSS (grande, multi-tema, design system)

De lo genérico a lo específico; la especificidad crece hacia abajo.

```
styles/
├── main.css                    # solo orden de @layer + @import
├── 00-tokens/
│   ├── primitives.css          # --blue-600, --gray-900...
│   ├── semantic.css            # --color-primary: var(--blue-600)...
│   └── themes.css              # [data-theme="..."] redefine semánticos
├── 01-base/
│   ├── reset.css
│   ├── typography.css
│   └── accessibility.css       # :focus-visible, .sr-only, reduced motion
├── 02-layout/
│   ├── container.css
│   └── grid.css
├── 03-components/
│   ├── button.css
│   └── card.css
└── 04-utilities/
    └── utilities.css           # pocas, de una sola responsabilidad
```

`main.css`:

```css
@layer reset, tokens, base, layout, components, utilities;

@import url("00-tokens/primitives.css");
@import url("00-tokens/semantic.css");
@import url("00-tokens/themes.css");
@import url("01-base/reset.css");
@import url("01-base/typography.css");
@import url("01-base/accessibility.css");
/* ...layout, components, utilities */
```

## Next / React con CSS Modules

```
app/
├── globals.css                 # @layer + @import de tokens, reset y base
├── layout.tsx                  # importa globals.css una vez + script de tema
└── page.tsx
styles/
├── tokens.css
├── reset.css
└── base.css
components/
└── Card/
    ├── Card.tsx
    └── Card.module.css         # junto al componente
```

Notas:

- **El archivo es el bloque.** La raíz se llama como el bloque (`.card`) o `.root`; los elementos llevan nombres cortos (`.title`, `.price`) y los modificadores también (`.featured`). CSS Modules ya aísla los nombres, así que no hace falta el prefijo `card__`.
- Mantén la convención que ya tenga el proyecto (camelCase `styles.priceTag` o kebab `styles['price-tag']`).
- Modificadores con `clsx`: `className={clsx(styles.card, featured && styles.featured)}`.
- Los tokens nunca se definen en un módulo: solo en `globals.css` (vía `styles/tokens.css`).
- Auditar con `--mode module` (el modo `auto` lo infiere por `.module.css`).

## Angular

```
src/
├── styles.css                  # declarado en angular.json: @layer + @import
├── styles/
│   ├── tokens.css
│   ├── reset.css
│   ├── base.css
│   └── utilities.css
└── app/
    └── card/
        ├── card.component.ts   # host: { class: 'card', '[class.card--featured]': 'featured()' }
        ├── card.component.html
        └── card.component.css  # :host = bloque
```

Notas:

- **Componente = bloque.** `:host` es la raíz; los elementos usan BEM completo (`.card__title`).
- Modificadores: clase en el host y `:host(.card--featured) { --card-border-color: ...; }` cambiando solo variables locales.
- Nada de `::ng-deep`: para personalizar un hijo, expón una variable CSS en el hijo y dale valor desde fuera.
- Auditar con `--mode angular` (el modo `auto` lo infiere por `.component.css`).

## Vue SFC

```
src/
├── assets/styles/
│   ├── main.css                # @layer + @import, importado una vez en main.ts
│   ├── tokens.css
│   ├── themes.css
│   ├── reset.css
│   └── base.css
└── components/
    └── ProductCard.vue         # <style scoped> con BEM completo
```

```vue
<template>
  <article :class="['card', { 'card--featured': featured }]">
    <h3 class="card__title">{{ title }}</h3>
  </article>
</template>

<style scoped>
.card {
  --card-border-color: var(--color-border);

  border: var(--border-width) solid var(--card-border-color);
}

.card__title {
  font-size: var(--font-size-lg);
}

.card--featured {
  --card-border-color: var(--color-primary);
}
</style>
```

`<style module>` sigue las reglas de CSS Modules. Evita `:deep()`; si es imprescindible, documenta el porqué.

## Astro

```
src/
├── styles/
│   ├── tokens.css
│   ├── themes.css              # después de tokens.css
│   ├── reset.css
│   ├── base.css
│   └── global.css              # @layer + @import; único punto de entrada global
├── layouts/
│   └── Layout.astro            # import '../styles/global.css' UNA vez + script inline de tema
├── components/
│   └── Card.astro              # <style> scoped con BEM completo
└── pages/
    └── index.astro
```

Notas:

- tokens + reset + base son globales y se importan **una sola vez**, en el layout raíz.
- El componente **es el bloque** y usa BEM completo dentro de su `<style>`: `.card`, `.card__title`, `.card--featured`. Aunque Astro aísle los estilos, BEM mantiene el HTML legible y el CSS portable.
- Modificadores con `class:list={['card', { 'card--featured': featured }]}`.
- `:global()` solo en el layout o en CSS global, **nunca** para estilizar otro bloque desde un componente. `<style is:global>` solo en el layout, y mejor aún en `src/styles/`.
- El script anti-parpadeo va con `<script is:inline>` en el `<head>` del layout.
- Auditar con `--mode scoped` (el modo `auto` lo infiere en `.astro`).

## Svelte / SvelteKit

Igual que Astro:

```
src/
├── styles/
│   ├── tokens.css
│   ├── themes.css
│   ├── reset.css
│   ├── base.css
│   └── global.css
├── routes/
│   └── +layout.svelte          # import '../styles/global.css' una vez
├── app.html                    # script inline de tema en <head>
└── lib/components/
    └── Card.svelte             # <style> scoped con BEM completo
```

```svelte
<script>
  let { title, featured = false } = $props();
</script>

<article class={['card', featured && 'card--featured']}>
  <h3 class="card__title">{title}</h3>
</article>

<style>
  .card {
    --card-border-color: var(--color-border);

    border: var(--border-width) solid var(--card-border-color);
  }

  .card__title {
    font-size: var(--font-size-lg);
  }

  .card--featured {
    --card-border-color: var(--color-primary);
  }
</style>
```

(En Svelte 4 usa `class:card--featured={featured}`.) `:global()` solo en el layout o CSS global.

## Por tamaños (mobile / tablet / desktop)

Cuando el proyecto ya separa por breakpoint, se **respeta**:

```
css/
├── reset.css
├── tokens.css
├── base.css        # TODO mobile-first, sin media queries
├── tablet.css      # @media (min-width: 768px) { solo lo que cambia }
└── desktop.css     # @media (min-width: 1024px) { solo lo que cambia }
```

Notas:

- `base.css` es la versión móvil completa; los demás archivos **solo** añaden diferencias.
- Los breakpoints son **los mismos** en todos los archivos y se documentan en la cabecera de cada uno (las media queries no aceptan `var()`).
- Si un bloque tiene pocas reglas responsive, se pueden dejar en su propio archivo junto al bloque en vez de repartirlas.
- Si el proyecto nombra los archivos `mobile.css`, `tablet.css`, `desktop.css`, se mantienen esos nombres.

## Tailwind

```
src/styles/
└── app.css
```

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(54.6% 0.245 263deg);
  --font-size-lg: 1.8rem;
}

@layer components {
  /* Solo lo que las utilidades no cubren bien (p. ej. contenido CMS, estados complejos). */
  .prose-content {
    line-height: var(--line-height-loose);
  }
}
```

Notas:

- Tokens en `@theme` (Tailwind v4) o en `:root` + `theme.extend` (v3), en **un** sitio.
- CSS propio solo para lo que las utilidades no cubren; si lo hay, en BEM.
- No mezcles en el mismo elemento un bloque BEM y utilidades que pisan sus propiedades, salvo motivo claro (p. ej. una utilidad de layout como `mt-4` en un mix).
- Ojo con la base 62.5%: Tailwind asume 16px; si cambias la base, ajusta su escala o mantén 16px y recalcula los tokens.

## Invariantes

En cualquier estructura:

- Tokens en **un** lugar global; los componentes solo los consumen.
- Reset **una** vez.
- Un dueño por bloque: un bloque vive en un solo archivo.
- Sin duplicados, código muerto, `!important` ni IDs.
- Se aplican las reglas BEM (`bem.md`), los tokens (`tokens.md`) y la checklist (`checklist.md`).
