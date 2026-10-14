# Checklist de auditoría

Úsala al terminar de escribir CSS y en cualquier revisión. Primero ejecuta el script; después repasa
los puntos **manuales**.

```bash
python3 <ruta-de-la-skill>/scripts/audit_css.py <archivos o carpetas> [--mode auto|global|module|angular|scoped] [--json] [--strict]
```

- `auto` (por defecto): `*.module.css` → module, `*.component.css` → angular, `.astro`/`.svelte` → scoped, `.vue` según los atributos de `<style>` (`scoped`, `module` o global), resto → global.
- Los archivos de tokens/temas (nombre o carpeta con `tokens`, `themes`, `primitives`, `semantic`, `variables`) y los bloques `:root`, `[data-theme...]`, `@theme`, `@property` están exentos de la regla de colores.
- Salida con código 1 si hay errores; `--strict` también falla con avisos; `--disable regla1,regla2` silencia reglas concretas (justifícalo).

Leyenda: **[E]** error del script · **[A]** aviso del script · **[M]** revisión manual.

## 1. BEM y selectores

- [ ] **[E] `bem-naming`**: clases en `.block`, `.block__element`, `.block--modifier`, minúsculas kebab-case (en `module`, regla `class-naming`: camelCase o kebab).
- [ ] **[E] `bem-nested-element`**: nada de `.block__a__b`.
- [ ] **[E] `no-id`**: ningún selector `#id`.
- [ ] **[E] `chained-classes`**: nada de `.a.b` (salvo estados `is-`/`has-`).
- [ ] **[E] `specificity`**: especificidad ≤ 0-1-0 (exentos: pseudo-clases de estado/estructurales, pseudo-elementos, `[aria-*]`, `is-`/`has-`, `:where()`, `:host`).
- [ ] **[E] `selector-depth`**: como mucho 3 niveles de selectores compuestos.
- [ ] **[E] `js-hook-styled`**: las clases `js-*` no tienen estilos.
- [ ] **[A] `state-without-block`**: `is-*`/`has-*` encadenados al bloque, no sueltos.
- [ ] **[A] `tag-selector`**: sin selectores de etiqueta en componentes (modos module/scoped/angular).
- [ ] **[A] `global-escape`**: `:global()`/`:deep()` solo en layout o CSS global, nunca para otro bloque.
- [ ] **[A] `ng-deep`**: sin `::ng-deep`.
- [ ] **[M]** El bloque es independiente: no depende de su posición ni del padre; sin márgenes externos propios.
- [ ] **[M]** Modificador siempre junto a la clase base en el HTML (`btn btn--primary`).
- [ ] **[M]** Mixes solo para separar layout de componente.
- [ ] **[M]** Un bloque, un dueño: el bloque solo se define en su archivo.

## 2. Tokens y temas

- [ ] **[E] `hardcoded-color`**: ningún hex, `rgb()`, `hsl()`, `oklch()` ni color con nombre fuera de tokens/temas.
- [ ] **[A] `magic-z-index`, `magic-radius`, `magic-shadow`, `magic-duration`, `magic-font-size`**: esos valores salen de tokens.
- [ ] **[A] `magic-number`**: ningún literal repetido más de una vez en un archivo (conviértelo en token o variable local).
- [ ] **[M]** Tokens definidos **una vez** en `:root`, en un archivo global; kebab-case en inglés.
- [ ] **[M]** Componentes usan solo tokens **semánticos** (nunca `--blue-600`).
- [ ] **[M]** Modificadores y estados cambian variables locales (`--btn-bg`), no repiten reglas.
- [ ] **[M]** Los temas solo redefinen semánticos; ninguna regla de componente dentro de `[data-theme]` o `prefers-color-scheme`.
- [ ] **[M]** Si hay temas seleccionables: `data-theme` en `<html>`, persistido en `localStorage`, script inline en `<head>` antes del primer pintado.
- [ ] **[M]** Contraste WCAG AA verificado **en cada tema** (texto 4.5:1; foco y bordes de controles 3:1).

## 3. Unidades, tipografía y layout

- [ ] **[E] `px-typography`**: sin px en `font-size`, `line-height`, `letter-spacing` ni `font`.
- [ ] **[A] `line-height-unitless`**: `line-height` sin unidades.
- [ ] **[A] `px-spacing`**: sin px en márgenes, rellenos ni `gap`.
- [ ] **[A] `fixed-width-px`**: sin anchos fijos en px.
- [ ] **[A] `logical-properties`**: propiedades lógicas (`margin-inline`, `padding-block`, `inline-size`, `inset-block-start`, `text-align: start`).
- [ ] **[M]** `html { font-size: 62.5%; }` y todo en rem (o la base 16px del proyecto, recalculada y coherente).
- [ ] **[M]** Mobile-first: estilos base sin media queries y `@media (min-width)` para crecer; breakpoints documentados e idénticos en todo el proyecto.
- [ ] **[M]** Tipografía fluida con `clamp()` en títulos.

## 4. Accesibilidad

- [ ] **[M]** `:focus-visible` con outline visible (`var(--focus-ring)`) en todo lo interactivo; nunca `outline: none` sin sustituto.
- [ ] **[M]** `prefers-reduced-motion` respetado (los tokens de transición pasan a 0ms).
- [ ] **[M]** `.sr-only` disponible para texto solo para lectores de pantalla.
- [ ] **[M]** Estados completos en controles: `:hover`, `:focus-visible`, `:active`, `:disabled`, `[aria-*]`.
- [ ] **[M]** Objetivos táctiles de al menos `var(--tap-target-min)` (44px).

## 5. Transiciones y animación

- [ ] **[E] `transition-all`**: nada de `transition: all` ni `transition-property: all`.
- [ ] **[A] `transition-implicit-all`**: `transition` sin propiedad equivale a `all`.
- [ ] **[A] `transition-property`**: solo `opacity`, `transform` (y `translate`/`scale`/`rotate`), `color`, `background-color`.

## 6. Limpieza

- [ ] **[E] `no-important`**: cero `!important`.
- [ ] **[A] `duplicate-property`**: sin propiedades repetidas en el mismo bloque.
- [ ] **[A] `duplicate-selector`**: sin selectores repetidos en el mismo contexto.
- [ ] **[A] `empty-rule`**: sin reglas vacías.
- [ ] **[A] `commented-code`**: sin código comentado.
- [ ] **[A] `vendor-prefix`**: sin prefijos manuales (Autoprefixer o Lightning CSS los ponen).
- [ ] **[M]** Sin código muerto: cada clase del CSS existe en el HTML/JSX/plantillas (búscala con `rg`).
- [ ] **[M]** Sin propiedades que se anulan entre sí ni selectores `*` pesados.
- [ ] **[M]** Shorthand cuando es más claro (`inset: 0`, `padding-block`).

## 7. Organización y formato

- [ ] **[M]** Estructura acorde al stack (o la existente respetada).
- [ ] **[M]** `@layer reset, tokens, base, layout, components, utilities;` declarado primero (si el entorno lo soporta).
- [ ] **[M]** Reset cargado una sola vez.
- [ ] **[M]** Orden de propiedades: posicionamiento → display/layout → box model → tipografía → visual → animación.
- [ ] **[M]** Cabecera breve en cada archivo; comentarios solo del «por qué».
- [ ] **[M]** `@media print` mínimo si el contenido se imprime.
- [ ] **[M]** stylelint con `assets/.stylelintrc.json` sin errores (`npx stylelint "**/*.css"`) y Prettier para el formato.

## Formato del informe de auditoría

Cuando el usuario pida auditar, responde con:

1. **Resumen**: archivos revisados, errores, avisos y veredicto (pasa / no pasa).
2. **Errores** agrupados por archivo, con línea, regla y cómo arreglarlo.
3. **Avisos** relevantes (y cuáles se aceptan, con motivo).
4. **Puntos manuales** que fallan (contraste, código muerto, estados incompletos...).
5. **Propuesta de corrección**: el CSS corregido o un diff, y el mapa de clases si cambia el HTML.

Ejemplo:

```
Resumen: 3 archivos · 5 errores · 2 avisos · NO PASA

styles/card.css
  L4   no-id            #header → .site-header
  L9   specificity      .card .title (0,2,0) → .card__title
  L10  px-typography    font-size: 14px → var(--font-size-sm)
  L11  hardcoded-color  #777 → var(--color-text-muted)
  L12  transition-all   transition: all → transition: background-color var(--transition-base) var(--ease-standard)
```
