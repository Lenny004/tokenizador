#!/usr/bin/env python3
"""audit_css.py - auditor de CSS de la skill css-bem-estandar (solo stdlib).

Escanea archivos .css y los bloques <style> de .astro, .svelte y .vue y
reporta violaciones de BEM, tokens, especificidad y limpieza.

Uso:
  python3 audit_css.py RUTA [RUTA ...] [--mode auto|global|module|angular|scoped]
                       [--json] [--strict] [--disable regla1,regla2]

Modos:
  auto     (por defecto) infiere por archivo: *.module.css -> module,
           *.component.css -> angular, .astro/.svelte -> scoped,
           .vue -> scoped/module/global según los atributos de <style>.
  global   CSS global: clases BEM estrictas.
  module   CSS Modules: acepta camelCase y nombres simples (archivo = bloque).
  angular  como global, y :host / :host(.mod) cuentan como raíz del bloque.
  scoped   <style> de Astro/Svelte/Vue: BEM estricto; :global() es aviso.

Código de salida: 0 sin errores, 1 si hay errores (o avisos con --strict),
2 si los argumentos son inválidos o no se encontró ningun archivo.
"""
from __future__ import annotations

import argparse
import bisect
import json
import os
import re
import sys

CSS_EXT = {".css"}
SFC_EXT = {".astro", ".svelte", ".vue"}
SKIP_DIRS = {
    "node_modules", "dist", "build", ".git", ".next", ".nuxt", ".output",
    ".astro", ".svelte-kit", "out", "coverage", "vendor", ".angular",
    ".cache", ".turbo", ".vercel", ".parcel-cache",
}
MODES = ("auto", "global", "module", "angular", "scoped")

NAME = r"[a-z0-9]+(?:-[a-z0-9]+)*"
BLOCK = r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
BEM_RE = re.compile(rf"^{BLOCK}(?:__{NAME})?(?:--{NAME})?$")
STATE_RE = re.compile(rf"^(?:is|has)-{NAME}$")
MODULE_RE = re.compile(r"^[a-z][a-zA-Z0-9]*(?:(?:__|--|-|_)[a-zA-Z0-9]+)*$")
NESTED_EL_RE = re.compile(r"__[^_\s]+__")
JS_HOOK_RE = re.compile(r"^js-")
IDENT = r"(?:\\.|[\w-]|[^\x00-\x7f])+"

TOKEN_FILE_RE = re.compile(
    r"(?:^|[._-])(?:tokens?|themes?|primitives|semantic|variables|vars)(?:[._-]|$)", re.I
)
TOKEN_SELECTOR_RE = re.compile(r":root|\[\s*data-theme", re.I)
TOKEN_AT_RULES = {"theme", "property"}

EXEMPT_PSEUDO = {
    "hover", "focus", "focus-visible", "focus-within", "active", "visited", "link",
    "any-link", "disabled", "enabled", "checked", "indeterminate", "invalid", "valid",
    "user-invalid", "user-valid", "required", "optional", "read-only", "read-write",
    "placeholder-shown", "target", "open", "closed", "popover-open", "modal",
    "first-child", "last-child", "only-child", "nth-child", "nth-last-child",
    "first-of-type", "last-of-type", "only-of-type", "nth-of-type",
    "nth-last-of-type", "empty", "autofill", "default", "in-range", "out-of-range",
}
EXEMPT_ATTR_RE = re.compile(r"^\[\s*(?:aria-[\w-]+.*|disabled|open|hidden)\s*\]$", re.S)
TRANSPARENT_PSEUDO = {"is", "not", "has", "matches", "-webkit-any", "-moz-any"}

NAMED_COLORS = {
    "black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink",
    "brown", "gray", "grey", "silver", "maroon", "navy", "teal", "olive", "lime",
    "aqua", "fuchsia", "cyan", "magenta", "gold", "indigo", "violet", "crimson",
    "coral", "salmon", "tomato", "beige", "ivory", "khaki", "lavender", "turquoise",
    "tan", "plum", "orchid", "chocolate", "firebrick", "darkred", "darkblue",
    "darkgreen", "darkgray", "darkgrey", "lightgray", "lightgrey", "lightblue",
    "lightgreen", "skyblue", "steelblue", "royalblue", "slategray", "slategrey",
    "dimgray", "dimgrey", "whitesmoke", "gainsboro", "midnightblue", "forestgreen",
    "seagreen", "hotpink", "deeppink", "rebeccapurple", "darkorange", "goldenrod",
}
NAMED_COLOR_RE = re.compile(
    r"(?<![\w-])(" + "|".join(sorted(NAMED_COLORS, key=len, reverse=True)) + r")(?![\w-])",
    re.I,
)
HEX_RE = re.compile(r"(?<![\w&-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])")
COLOR_FN_RE = re.compile(r"(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*(?!from\s)", re.I)
COLOR_SKIP_PROPS = {
    "font-family", "font", "grid-template-areas", "grid-area", "grid-row",
    "grid-column", "animation", "animation-name", "transition",
    "transition-property", "content", "counter-reset", "counter-increment",
    "counter-set", "list-style-type", "will-change", "container-name",
    "container", "view-transition-name", "font-feature-settings",
    "font-variation-settings", "quotes", "anchor-name", "position-anchor",
}
PX_RE = re.compile(r"(?<![\w.#-])(-?\d*\.?\d+)px\b", re.I)
TYPO_PROPS = {"font-size", "line-height", "letter-spacing", "font"}
TYPO_CUSTOM_RE = re.compile(r"font-size|line-height|letter-spacing|leading|tracking")
TIME_RE = re.compile(r"^-?\d*\.?\d+m?s$", re.I)
EASING_WORDS = {
    "ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start",
    "step-end", "allow-discrete", "normal",
}
ALLOWED_TRANSITION = {"opacity", "transform", "translate", "scale", "rotate", "color", "background-color"}
VENDOR_OK = {
    "-webkit-line-clamp", "-webkit-box-orient", "-webkit-tap-highlight-color",
    "-webkit-font-smoothing", "-moz-osx-font-smoothing", "-webkit-text-stroke",
}
SIDE_MAP = {"top": "block-start", "bottom": "block-end", "left": "inline-start", "right": "inline-end"}
SIZE_MAP = {
    "width": "inline-size", "height": "block-size", "min-width": "min-inline-size",
    "max-width": "max-inline-size", "min-height": "min-block-size", "max-height": "max-block-size",
}
RADIUS_MAP = {
    "border-top-left-radius": "border-start-start-radius",
    "border-top-right-radius": "border-start-end-radius",
    "border-bottom-left-radius": "border-end-start-radius",
    "border-bottom-right-radius": "border-end-end-radius",
}
PHYS_BOX_RE = re.compile(r"^(margin|padding|border|scroll-margin|scroll-padding)-(top|bottom|left|right)(-(?:width|style|color))?$")
WIDTH_PROPS = {"width", "min-width", "max-width", "inline-size", "min-inline-size", "max-inline-size"}
SPACING_RE = re.compile(r"^(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(?:-[\w-]+)?$")
SPACING_CUSTOM_RE = re.compile(r"space|gap|padding|margin|gutter")
RADIUS_RE = re.compile(r"^border(?:-[\w-]+)?-radius$")
LENGTH_IN_VALUE_RE = re.compile(r"(?<![\w.-])-?\d*\.?\d+(?:px|rem|em)\b", re.I)
NUM_TOKEN_RE = re.compile(
    r"(?<![\w.#-])(-?\d*\.?\d+(?:px|rem|em|ms|s|vh|vw|dvh|svh|lvh|vmin|vmax|ch|ex|deg|%)?)(?![\w.-])",
    re.I,
)
MAGIC_IGNORE_VALUES = {"0", "0px", "0rem", "0%", "1", "-1", "1px", "100%", "50%", "0s", "0ms", "1em", "2"}
MAGIC_SKIP_PROPS = {
    "flex", "flex-grow", "flex-shrink", "order", "grid-row", "grid-column",
    "grid-area", "grid-template-columns", "grid-template-rows", "aspect-ratio",
    "content", "counter-reset", "counter-increment", "animation-iteration-count",
    "columns", "column-count", "z-index", "font-variation-settings",
    "font-feature-settings", "line-clamp", "-webkit-line-clamp", "tab-size",
    "transition", "transition-duration", "transition-delay", "animation",
    "animation-duration", "animation-delay",
}
COMMENTED_CODE_RES = (
    re.compile(r"[\w\]):-]\s*\{\s*-{0,2}[a-zA-Z][\w-]*\s*:[^{}]*\}"),
    re.compile(r"^\s*-{0,2}[a-z][\w-]*\s*:\s*[^;\n]+;\s*$", re.M),
)

SEVERITY_ORDER = {"error": 0, "warning": 1}


# --------------------------------------------------------------------------- utilidades

def split_top(text: str, sep: str = ",") -> list[str]:
    """Divide por `sep` fuera de paréntesis, corchetes y comillas."""
    parts, buf, depth, quote = [], [], 0, None
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and i + 1 < len(text):
                buf.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            buf.append(ch)
        elif ch in "([":
            depth += 1
            buf.append(ch)
        elif ch in ")]":
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def strip_strings(text: str) -> str:
    return re.sub(r"\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'", '""', text)


def strip_urls(text: str) -> str:
    return re.sub(r"url\([^)]*\)", "url()", text, flags=re.I)


def remove_attr_selectors(sel: str) -> str:
    out, depth = [], 0
    for ch in sel:
        if ch == "[":
            depth += 1
            if depth == 1:
                out.append("[]")
            continue
        if ch == "]":
            depth = max(0, depth - 1)
            continue
        if depth == 0:
            out.append(ch)
    return "".join(out)


def compounds(sel: str) -> list[str]:
    """Separa un selector complejo en selectores compuestos (por combinadores)."""
    parts, buf, depth, quote = [], [], 0, None
    for ch in sel:
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if depth == 0 and (ch.isspace() or ch in ">+~"):
            if buf:
                parts.append("".join(buf))
                buf = []
            continue
        buf.append(ch)
    if buf:
        parts.append("".join(buf))
    return parts


def balanced(text: str, start: int, open_ch: str, close_ch: str) -> int:
    """Devuelve el índice del cierre que equilibra text[start] (== open_ch)."""
    depth, i, quote = 0, start, None
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return len(text) - 1


IDENT_AT = re.compile(IDENT)


def simples(comp: str) -> list[tuple[str, str, str]]:
    """Tokeniza un selector compuesto en (tipo, nombre, argumentos)."""
    out, i, n = [], 0, len(comp)
    while i < n:
        ch = comp[i]
        if ch == ".":
            m = IDENT_AT.match(comp, i + 1)
            if m:
                out.append(("class", m.group(0), ""))
                i = m.end()
                continue
        elif ch == "#":
            m = IDENT_AT.match(comp, i + 1)
            if m:
                out.append(("id", m.group(0), ""))
                i = m.end()
                continue
        elif ch == "[":
            j = balanced(comp, i, "[", "]")
            out.append(("attr", comp[i:j + 1], ""))
            i = j + 1
            continue
        elif ch == ":":
            is_el = comp.startswith("::", i)
            k = i + (2 if is_el else 1)
            m = IDENT_AT.match(comp, k)
            name = m.group(0).lower() if m else ""
            k = m.end() if m else k
            args = ""
            if k < n and comp[k] == "(":
                j = balanced(comp, k, "(", ")")
                args = comp[k + 1:j]
                k = j + 1
            out.append(("pseudo-element" if is_el else "pseudo", name, args))
            i = k
            continue
        elif ch == "&":
            out.append(("nest", "&", ""))
        elif ch == "*":
            out.append(("universal", "*", ""))
        elif re.match(r"[A-Za-z_-]", ch):
            m = IDENT_AT.match(comp, i)
            if m:
                out.append(("type", m.group(0), ""))
                i = m.end()
                continue
        i += 1
    return out


def simples_have_class(sel: str) -> bool:
    return any(k == "class" for comp in compounds(sel) for k, _, _ in simples(comp))


def specificity(sel_list: str) -> tuple[int, int, int]:
    """Especificidad máxima de una lista de selectores, con las exenciones
    de la skill (pseudo-clases de estado/estructurales, pseudo-elementos,
    is-/has-, [aria-*], :where, :host). Igual criterio que .stylelintrc.json."""
    best = (0, 0, 0)
    for sel in split_top(sel_list):
        a = b = c = 0
        for comp in compounds(sel):
            for kind, name, args in simples(comp):
                if kind == "id":
                    a += 1
                elif kind == "class":
                    if not STATE_RE.match(name):
                        b += 1
                elif kind == "attr":
                    if not EXEMPT_ATTR_RE.match(name):
                        b += 1
                elif kind == "type":
                    c += 1
                elif kind == "pseudo":
                    if name == "where":
                        continue
                    if name in TRANSPARENT_PSEUDO or name in {"host", "host-context", "global", "local", "deep", "slotted"}:
                        if args:
                            sa, sb, sc = specificity(args)
                            a, b, c = a + sa, b + sb, c + sc
                        continue
                    if name in EXEMPT_PSEUDO:
                        continue
                    b += 1
        best = max(best, (a, b, c))
    return best


# --------------------------------------------------------------------------- auditor

class Node:
    __slots__ = ("kind", "prelude", "line", "name", "parent", "selectors",
                 "token_ctx", "keyframes", "decls", "has_content")

    def __init__(self, kind, prelude, line, parent):
        self.kind = kind
        self.prelude = prelude
        self.line = line
        self.parent = parent
        self.name = ""
        self.selectors: list[str] = []
        self.token_ctx = bool(parent and parent.token_ctx)
        self.keyframes = bool(parent and parent.keyframes)
        self.decls: dict[str, int] = {}
        self.has_content = False


class FileReport:
    def __init__(self, path: str, mode: str):
        self.path = path
        self.modes: list[str] = [mode] if mode else []
        self.issues: list[dict] = []
        self._seen: set = set()

    def add(self, line, severity, rule, message, context=""):
        key = (line, rule, message)
        if key in self._seen:
            return
        self._seen.add(key)
        ctx = " ".join(context.split())
        if len(ctx) > 90:
            ctx = ctx[:87] + "..."
        self.issues.append({"line": line, "severity": severity, "rule": rule,
                            "message": message, "context": ctx})

    @property
    def errors(self):
        return sum(1 for i in self.issues if i["severity"] == "error")

    @property
    def warnings(self):
        return sum(1 for i in self.issues if i["severity"] == "warning")


class BlockAuditor:
    """Audita un bloque de CSS (archivo completo o un <style>)."""

    def __init__(self, css, base_line, mode, report, is_token_file, magic, scss=False):
        self.raw = css
        self.mode = mode
        self.report = report
        self.is_token_file = is_token_file
        self.base_line = base_line
        self.magic = magic  # dict valor -> [líneas], compartido por archivo
        self.css, comments = self.strip_comments(css, scss)
        self.nl = [i for i, ch in enumerate(self.css) if ch == "\n"]
        self.seen_selectors: dict[tuple, int] = {}
        for pos, body in comments:
            self.check_comment(pos, body)

    # -- infraestructura
    def line_of(self, pos: int) -> int:
        return self.base_line + bisect.bisect_left(self.nl, pos)

    def add(self, pos_or_line, severity, rule, message, context="", is_line=False):
        line = pos_or_line if is_line else self.line_of(pos_or_line)
        self.report.add(line, severity, rule, message, context)

    @staticmethod
    def strip_comments(text, scss):
        out, comments, i, n, quote = [], [], 0, len(text), None
        while i < n:
            ch = text[i]
            if quote:
                out.append(ch)
                if ch == "\\" and i + 1 < n:
                    out.append(text[i + 1])
                    i += 2
                    continue
                if ch == quote or ch == "\n":
                    quote = None
                i += 1
                continue
            if ch in "\"'":
                quote = ch
                out.append(ch)
                i += 1
                continue
            if ch == "/" and i + 1 < n and text[i + 1] == "*":
                end = text.find("*/", i + 2)
                end = n if end == -1 else end + 2
                body = text[i:end]
                comments.append((i, body))
                out.append("".join("\n" if c == "\n" else " " for c in body))
                i = end
                continue
            if scss and ch == "/" and i + 1 < n and text[i + 1] == "/" and (i == 0 or text[i - 1] != ":"):
                end = text.find("\n", i)
                end = n if end == -1 else end
                out.append(" " * (end - i))
                i = end
                continue
            out.append(ch)
            i += 1
        return "".join(out), comments

    def check_comment(self, pos, body):
        inner = body[2:-2] if body.endswith("*/") else body[2:]
        if "stylelint-" in inner or "prettier-ignore" in inner:
            return
        if any(r.search(inner) for r in COMMENTED_CODE_RES):
            self.add(pos, "warning", "commented-code",
                     "Código comentado: bórralo (el historial ya lo guarda en git)", inner.strip()[:60])

    # -- parser
    def run(self):
        css, n = self.css, len(self.css)
        stack: list[Node] = []
        seg, i, paren, bracket = 0, 0, 0, 0
        while i < n:
            ch = css[i]
            if ch in "\"'":
                j = i + 1
                while j < n and css[j] != ch and css[j] != "\n":
                    j += 2 if css[j] == "\\" else 1
                i = j + 1
                continue
            if ch == "(":
                paren += 1
            elif ch == ")":
                paren = max(0, paren - 1)
            elif ch == "[":
                bracket += 1
            elif ch == "]":
                bracket = max(0, bracket - 1)
            elif paren == 0 and bracket == 0:
                if ch == "{":
                    start = self.first_non_ws(seg, i)
                    node = self.open_node(css[seg:i].strip(), start, stack)
                    if stack:
                        stack[-1].has_content = True
                    stack.append(node)
                    seg = i + 1
                elif ch == ";":
                    self.statement(seg, i, stack)
                    seg = i + 1
                elif ch == "}":
                    self.statement(seg, i, stack)
                    if stack:
                        closed = stack.pop()
                        if closed.kind == "rule" and not closed.has_content:
                            self.add(closed.line, "warning", "empty-rule",
                                     "Regla vacía: elimínala", closed.prelude, is_line=True)
                    seg = i + 1
            i += 1

    def first_non_ws(self, a, b):
        while a < b and self.css[a].isspace():
            a += 1
        return a

    def open_node(self, prelude, pos, stack):
        parent = stack[-1] if stack else None
        line = self.line_of(pos)
        if prelude.startswith("@"):
            node = Node("at", prelude, line, parent)
            m = re.match(r"@([\w-]+)", prelude)
            node.name = m.group(1).lower() if m else ""
            if node.name.endswith("keyframes"):
                node.keyframes = True
            if node.name in TOKEN_AT_RULES:
                node.token_ctx = True
            return node
        node = Node("rule", prelude, line, parent)
        if node.keyframes:
            node.kind = "keyframe"
            return node
        parent_rule = parent
        while parent_rule and parent_rule.kind != "rule":
            parent_rule = parent_rule.parent
        node.selectors = self.resolve(parent_rule.selectors if parent_rule else [], prelude)
        # Contexto de tokens: :root / [data-theme] sin clases (un tema nunca estiliza bloques).
        own = split_top(prelude)
        if own and all(TOKEN_SELECTOR_RE.search(s) and not simples_have_class(s) for s in own):
            node.token_ctx = True
        self.check_selector(node, stack)
        return node

    @staticmethod
    def resolve(parents, own):
        out = []
        for s in split_top(own):
            if not parents:
                out.append(s)
            elif "&" in s:
                out.extend(s.replace("&", p) for p in parents)
            else:
                out.extend(f"{p} {s}" for p in parents)
        return out[:64]

    # -- selectores
    def check_selector(self, node, stack):
        mode, line, own = self.mode, node.line, node.prelude
        ctx = tuple(n.prelude for n in stack if n.kind == "at")
        key = (ctx, tuple(sorted(" ".join(s.split()) for s in node.selectors)))
        if key in self.seen_selectors:
            self.add(line, "warning", "duplicate-selector",
                     f"Selector duplicado (ya definido en la línea {self.seen_selectors[key]}): un bloque, un dueño",
                     own, is_line=True)
        else:
            self.seen_selectors[key] = line

        for sel in node.selectors:
            clean = remove_attr_selectors(strip_strings(sel))
            reported = False
            if re.search(r"#-?[_a-zA-Z][\w-]*", clean):
                self.add(line, "error", "no-id", "Selector de ID prohibido: usa una clase BEM", sel, is_line=True)
                reported = True

            comps = compounds(sel)
            if len(comps) > 3:
                self.add(line, "error", "selector-depth",
                         f"Selector con {len(comps)} niveles (máx. 3): aplana con una clase BEM propia", sel, is_line=True)
                reported = True

            has_class = False
            for comp in comps:
                parts = simples(comp)
                classes = [p[1] for p in parts if p[0] == "class"]
                if classes:
                    has_class = True
                non_state = [c for c in classes if not STATE_RE.match(c)]
                if len(non_state) >= 2:
                    self.add(line, "error", "chained-classes",
                             f"Clases encadenadas ({'.' + '.'.join(non_state)}): usa un modificador --mod",
                             sel, is_line=True)
                    reported = True
                if classes and not non_state and not any(p[0] == "pseudo" and p[1] in ("host", "global") for p in parts):
                    self.add(line, "warning", "state-without-block",
                             "Clase de estado is-/has- suelta: encadénala al bloque o elemento (.menu.is-open)",
                             sel, is_line=True)
                for kind, name, args in parts:
                    if kind == "pseudo" and name in ("global", "deep") and mode in ("scoped", "module"):
                        self.add(line, "warning", "global-escape",
                                 f":{name}() solo en el layout/global; nunca para estilizar otro bloque", sel, is_line=True)
                    if kind == "pseudo-element" and name == "ng-deep":
                        self.add(line, "warning", "ng-deep", "::ng-deep está obsoleto: expone una variable local en el hijo", sel, is_line=True)
                    if kind == "pseudo" and name in ("host", "host-context") and mode in ("global", "module"):
                        self.add(line, "warning", "host-outside-angular",
                                 ":host solo tiene sentido en Angular / Shadow DOM", sel, is_line=True)
                for cls in self.classes_in(comp):
                    self.check_class(cls, line, sel)

            if mode in ("module", "scoped", "angular") and not has_class:
                types = [p for c in comps for p in simples(c) if p[0] == "type" and p[1].lower() not in ("html", "body")]
                hosts = [p for c in comps for p in simples(c) if p[0] == "pseudo" and p[1] in ("host", "global", "root")]
                if types and not hosts:
                    self.add(line, "warning", "tag-selector",
                             "Selector de etiqueta en un componente: dale una clase de elemento BEM", sel, is_line=True)

            if not reported:
                spec = specificity(sel)
                if spec > (0, 1, 0):
                    self.add(line, "error", "specificity",
                             f"Especificidad {spec[0]},{spec[1]},{spec[2]} > 0,1,0: usa una sola clase BEM "
                             "(y variables locales para modificadores/estados)", sel, is_line=True)

    def classes_in(self, comp):
        found = []
        for kind, name, args in simples(comp):
            if kind == "class":
                found.append(name)
            elif kind in ("pseudo", "pseudo-element") and args and name not in ("nth-child", "nth-last-child", "lang", "dir"):
                for sub in split_top(args):
                    for c in compounds(sub):
                        found.extend(self.classes_in(c))
        return found

    def check_class(self, cls, line, sel):
        if JS_HOOK_RE.match(cls):
            self.add(line, "error", "js-hook-styled", f"'.{cls}' es un hook de JS: los js-* nunca llevan estilos", sel, is_line=True)
            return
        if NESTED_EL_RE.search(cls):
            self.add(line, "error", "bem-nested-element",
                     f"Elemento anidado '.{cls}': prohibido __a__b, usa .bloque__elemento", sel, is_line=True)
            return
        if STATE_RE.match(cls):
            return
        if self.mode == "module":
            if not (MODULE_RE.match(cls) or BEM_RE.match(cls)):
                self.add(line, "error", "class-naming",
                         f"Clase '.{cls}' inválida para CSS Modules: camelCase o kebab-case (archivo = bloque)", sel, is_line=True)
            return
        if not BEM_RE.match(cls):
            self.add(line, "error", "bem-naming",
                     f"Clase '.{cls}' no cumple BEM (bloque__elemento--modificador, minúsculas kebab-case)", sel, is_line=True)

    # -- declaraciones
    def statement(self, a, b, stack):
        text = self.css[a:b]
        if not text.strip():
            return
        pos = self.first_non_ws(a, b)
        text = text.strip()
        if text.startswith("@") or not stack:
            return
        owner = stack[-1]
        colon = self.top_colon(text)
        if colon < 0:
            return
        prop = text[:colon].strip()
        value = text[colon + 1:].strip()
        if not re.match(r"^(?:--[\w-]+|-?[a-zA-Z][\w-]*)$", prop):
            return
        owner.has_content = True
        if not prop.startswith("--"):
            prop = prop.lower()
        self.check_decl(prop, value, pos, owner, text)

    @staticmethod
    def top_colon(text):
        depth = 0
        for i, ch in enumerate(text):
            if ch in "([":
                depth += 1
            elif ch in ")]":
                depth -= 1
            elif ch == ":" and depth == 0:
                return i
        return -1

    def check_decl(self, prop, value, pos, owner, text):
        line = self.line_of(pos)
        token_ctx = self.is_token_file or owner.token_ctx
        is_custom = prop.startswith("--")
        bare = re.sub(r"!\s*important", "", value, flags=re.I).strip()
        clean = strip_urls(strip_strings(bare))
        novars = re.sub(r"--[\w-]+", "", clean)

        if re.search(r"!\s*important", value, re.I):
            self.add(line, "error", "no-important", "!important prohibido: corrige la especificidad o usa @layer", text, is_line=True)

        # duplicados
        if prop in owner.decls:
            self.add(line, "warning", "duplicate-property",
                     f"Propiedad '{prop}' repetida en el mismo bloque (línea {owner.decls[prop]}): la primera se anula",
                     text, is_line=True)
        else:
            owner.decls[prop] = line

        # colores
        if not token_ctx and prop not in COLOR_SKIP_PROPS:
            found = [m.group(0) for m in HEX_RE.finditer(novars)]
            found += [m.group(1) + "()" for m in COLOR_FN_RE.finditer(novars)]
            found += [m.group(1) for m in NAMED_COLOR_RE.finditer(re.sub(r"[\w-]+\(", "(", novars))]
            if found:
                self.add(line, "error", "hardcoded-color",
                         f"Color hardcodeado ({', '.join(dict.fromkeys(found))}): usa un token semántico var(--color-...)",
                         text, is_line=True)

        # tipografía en px
        if prop in TYPO_PROPS or (is_custom and TYPO_CUSTOM_RE.search(prop)):
            if PX_RE.search(novars):
                self.add(line, "error", "px-typography",
                         f"px en tipografía ({prop}): usa rem (1rem = 10px con html 62.5%) o un token", text, is_line=True)
        if prop == "line-height" or (is_custom and "line-height" in prop):
            if re.search(r"(?<![\w.-])\d*\.?\d+(?:rem|em|%)(?![\w-])", novars):
                self.add(line, "warning", "line-height-unitless", "line-height debe ir sin unidades (1.5)", text, is_line=True)

        # transiciones
        if prop in ("transition", "transition-property"):
            self.check_transition(prop, novars, clean, line, text)

        if not is_custom:
            self.check_logical(prop, novars, line, text)
            if re.match(r"^-(?:webkit|moz|ms|o)-", prop) and prop not in VENDOR_OK:
                self.add(line, "warning", "vendor-prefix", "Prefijo manual: deja que Autoprefixer/Lightning CSS lo gestione", text, is_line=True)
            elif re.search(r"(?<![\w-])-(?:webkit|moz|ms|o)-(?!box\b)", novars):
                self.add(line, "warning", "vendor-prefix", "Valor con prefijo manual: deja que la herramienta de build lo gestione", text, is_line=True)

        # px en anchos y espaciado
        px_vals = [float(m.group(1)) for m in PX_RE.finditer(novars)]
        big_px = [v for v in px_vals if abs(v) >= 2]
        if big_px and prop in WIDTH_PROPS:
            self.add(line, "warning", "fixed-width-px", "Ancho fijo en px: usa rem, %, ch, min()/clamp() o un token", text, is_line=True)
        elif big_px and (SPACING_RE.match(prop) or (is_custom and SPACING_CUSTOM_RE.search(prop))):
            self.add(line, "warning", "px-spacing", "px en espaciado: usa rem o un token var(--space-...)", text, is_line=True)

        if token_ctx:
            return
        # valores mágicos (solo fuera de tokens)
        if prop == "z-index" and re.fullmatch(r"-?\d+", bare) and abs(int(bare)) > 1:
            self.add(line, "warning", "magic-z-index", "z-index literal: usa var(--z-...)", text, is_line=True)
        if RADIUS_RE.match(prop) and LENGTH_IN_VALUE_RE.search(novars) and "var(" not in clean:
            self.add(line, "warning", "magic-radius", "Radio literal: usa var(--radius-...)", text, is_line=True)
        if prop == "box-shadow" and bare.lower() not in ("none", "inherit", "initial", "unset") and "var(" not in clean:
            self.add(line, "warning", "magic-shadow", "Sombra literal: usa var(--shadow-...)", text, is_line=True)
        if prop in ("transition", "transition-duration", "transition-delay", "animation", "animation-duration", "animation-delay"):
            if re.search(r"(?<![\w.-])\d*\.?\d+m?s(?![\w-])", re.sub(r"var\([^)]*\)", "", novars)):
                self.add(line, "warning", "magic-duration", "Duración literal: usa var(--transition-...)", text, is_line=True)
        if prop == "font-size" and LENGTH_IN_VALUE_RE.search(novars) and "var(" not in clean:
            self.add(line, "warning", "magic-font-size", "Tamaño de fuente literal: usa var(--font-size-...)", text, is_line=True)
        if prop not in MAGIC_SKIP_PROPS:
            for m in NUM_TOKEN_RE.finditer(re.sub(r"var\(\s*,?", "(", novars)):
                tok = m.group(1).lower()
                if tok in MAGIC_IGNORE_VALUES or re.fullmatch(r"-?\d+", tok) and prop != "opacity" and prop != "font-weight":
                    continue
                self.magic.setdefault(tok, []).append(line)

    def check_transition(self, prop, novars, clean, line, text):
        items = split_top(novars)
        for item in items:
            if re.search(r"(?<![\w-])all(?![\w-])", item, re.I):
                self.add(line, "error", "transition-all",
                         "transition: all prohibido: lista solo opacity, transform, color, background-color", text, is_line=True)
                return
        if prop == "transition-property":
            props = [p.strip().lower() for p in items]
        else:
            props = []
            for item in items:
                flat = re.sub(r"[\w-]+\([^)]*\)", " FN ", item)
                words = [w for w in flat.split() if w != "FN"]
                ident = [w for w in words if not TIME_RE.match(w) and w.lower() not in EASING_WORDS
                         and not re.fullmatch(r"-?\d*\.?\d+", w)]
                if ident:
                    props.append(ident[0].lower())
                elif "var(" in item.lower() or "var(" in clean.lower():
                    continue  # la propiedad puede venir en la variable: no se puede saber
                elif words or "FN" in flat:
                    self.add(line, "warning", "transition-implicit-all",
                             "transition sin propiedad equivale a 'all': nombra la propiedad", text, is_line=True)
        bad = [p for p in props if p not in ALLOWED_TRANSITION and p not in ("none", "initial", "inherit", "unset")]
        if bad:
            self.add(line, "warning", "transition-property",
                     f"Transición de {', '.join(bad)}: anima solo opacity, transform, color o background-color",
                     text, is_line=True)

    def check_logical(self, prop, value, line, text):
        sugg = None
        m = PHYS_BOX_RE.match(prop)
        if m:
            sugg = f"{m.group(1)}-{SIDE_MAP[m.group(2)]}{m.group(3) or ''}"
        elif prop in SIDE_MAP:
            sugg = f"inset-{SIDE_MAP[prop]}"
        elif prop in SIZE_MAP:
            sugg = SIZE_MAP[prop]
        elif prop in RADIUS_MAP:
            sugg = RADIUS_MAP[prop]
        elif prop in ("text-align", "float", "clear") and re.search(r"\b(left|right)\b", value):
            sugg = f"{prop}: start/end" if prop == "text-align" else f"{prop}: inline-start/inline-end"
        if sugg:
            self.add(line, "warning", "logical-properties", f"Propiedad física '{prop}': usa {sugg}", text, is_line=True)


# --------------------------------------------------------------------------- archivos

STYLE_RE = re.compile(r"<style\b([^>]*)>(.*?)</style\s*>", re.S | re.I)
MASK_RES = (
    re.compile(r"\A\s*---.*?^---", re.S | re.M),          # frontmatter de Astro
    re.compile(r"<!--.*?-->", re.S),                         # comentarios HTML
    re.compile(r"<script\b[^>]*>.*?</script\s*>", re.S | re.I),
)


def mask_non_style(text: str) -> str:
    """Blanquea frontmatter, comentarios HTML y <script> conservando posiciones
    y saltos de línea, para que un '<style>' citado en ellos no se tome por un bloque."""
    for rx in MASK_RES:
        text = rx.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)
    return text


def infer_mode(path: str, attrs: str | None) -> str:
    low = path.lower()
    if attrs is not None:
        a = attrs.lower()
        if re.search(r"\bmodule\b", a):
            return "module"
        if "is:global" in a or (low.endswith(".svelte") and re.search(r"\bglobal\b", a)):
            return "global"
        if low.endswith(".vue") and not re.search(r"\bscoped\b", a):
            return "global"
        return "scoped"
    if low.endswith(".module.css"):
        return "module"
    if low.endswith(".component.css"):
        return "angular"
    return "global"


def is_token_file(path: str) -> bool:
    base = os.path.basename(path)
    parent = os.path.basename(os.path.dirname(path))
    return bool(TOKEN_FILE_RE.search(base) or TOKEN_FILE_RE.search(parent))


def audit_file(path: str, forced_mode: str) -> FileReport:
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
    except OSError as exc:
        rep = FileReport(path, forced_mode)
        rep.add(0, "error", "read-error", f"No se pudo leer: {exc}")
        return rep
    tokens = is_token_file(path)
    magic: dict[str, list[int]] = {}
    ext = os.path.splitext(path)[1].lower()
    if ext in SFC_EXT:
        rep = FileReport(path, "")
        for m in STYLE_RE.finditer(mask_non_style(text)):
            attrs, body = m.group(1), m.group(2)
            mode = forced_mode if forced_mode != "auto" else infer_mode(path, attrs)
            if mode not in rep.modes:
                rep.modes.append(mode)
            lang = re.search(r"\blang\s*=\s*[\"']?(\w+)", attrs or "")
            lang = lang.group(1).lower() if lang else "css"
            start_line = text.count("\n", 0, m.start(2)) + 1
            if lang in ("sass", "styl", "stylus"):
                rep.add(start_line, "warning", "unsupported-syntax", f"Sintaxis '{lang}' no auditada; revísala a mano")
                continue
            BlockAuditor(body, start_line, mode, rep, tokens, magic, scss=lang in ("scss", "less", "postcss")).run()
    else:
        mode = forced_mode if forced_mode != "auto" else infer_mode(path, None)
        rep = FileReport(path, mode)
        BlockAuditor(text, 1, mode, rep, tokens, magic).run()
    for value, lines in magic.items():
        if len(lines) >= 2:
            shown = ", ".join(str(n) for n in lines[:6]) + (" ..." if len(lines) > 6 else "")
            rep.add(lines[0], "warning", "magic-number",
                    f"Valor '{value}' repetido {len(lines)} veces (líneas {shown}): conviértelo en token o variable local")
    rep.issues.sort(key=lambda i: (i["line"], SEVERITY_ORDER[i["severity"]], i["rule"]))
    return rep


def collect(paths: list[str]) -> tuple[list[str], list[str]]:
    files, missing = [], []
    for p in paths:
        if os.path.isdir(p):
            for root, dirs, names in os.walk(p):
                dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
                for name in sorted(names):
                    if os.path.splitext(name)[1].lower() in CSS_EXT | SFC_EXT:
                        files.append(os.path.join(root, name))
        elif os.path.isfile(p):
            files.append(p)
        else:
            missing.append(p)
    seen, unique = set(), []
    for f in files:
        k = os.path.abspath(f)
        if k not in seen:
            seen.add(k)
            unique.append(f)
    return unique, missing


def print_human(reports, forced_mode, strict):
    total_e = sum(r.errors for r in reports)
    total_w = sum(r.warnings for r in reports)
    print(f"Auditoría CSS - css-bem-estandar (modo: {forced_mode})")
    print("=" * 60)
    for r in reports:
        modes = ",".join(r.modes) or "sin <style>"
        if not r.issues:
            print(f"OK  {r.path}  [{modes}]")
            continue
        print(f"\n{r.path}  [{modes}]  {r.errors} error(es), {r.warnings} aviso(s)")
        for i in r.issues:
            sev = "ERROR" if i["severity"] == "error" else "aviso"
            print(f"  L{i['line']:<5} {sev:<6} {i['rule']:<24} {i['message']}")
            if i["context"]:
                print(f"  {'':<38}> {i['context']}")
    print("\n" + "-" * 60)
    clean = sum(1 for r in reports if not r.issues)
    print(f"Resumen: {len(reports)} archivo(s), {clean} limpio(s), {total_e} error(es), {total_w} aviso(s)")
    failed = total_e > 0 or (strict and total_w > 0)
    print("Resultado: " + ("FALLA" if failed else "PASA"))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Audita CSS (BEM + tokens) en .css y bloques <style> de .astro/.svelte/.vue.")
    ap.add_argument("paths", nargs="+", help="archivos o directorios (recursivo; ignora node_modules, dist...)")
    ap.add_argument("--mode", choices=MODES, default="auto",
                    help="global | module (CSS Modules) | angular | scoped (Astro/Svelte/Vue). Por defecto: auto")
    ap.add_argument("--json", action="store_true", help="salida JSON")
    ap.add_argument("--strict", action="store_true", help="los avisos tambien hacen fallar (exit 1)")
    ap.add_argument("--disable", default="", help="reglas a ignorar, separadas por comas")
    args = ap.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass

    files, missing = collect(args.paths)
    for m in missing:
        print(f"audit_css: no existe: {m}", file=sys.stderr)
    if not files:
        print("audit_css: no se encontraron archivos .css/.astro/.svelte/.vue", file=sys.stderr)
        return 2

    disabled = {d.strip() for d in args.disable.split(",") if d.strip()}
    reports = []
    for f in files:
        rep = audit_file(f, args.mode)
        if disabled:
            rep.issues = [i for i in rep.issues if i["rule"] not in disabled]
        reports.append(rep)

    total_e = sum(r.errors for r in reports)
    total_w = sum(r.warnings for r in reports)
    failed = total_e > 0 or (args.strict and total_w > 0)
    if args.json:
        print(json.dumps({
            "mode": args.mode,
            "files": [{"file": r.path, "modes": r.modes, "errors": r.errors,
                       "warnings": r.warnings, "issues": r.issues} for r in reports],
            "summary": {"files": len(reports), "errors": total_e, "warnings": total_w,
                        "passed": not failed},
        }, ensure_ascii=False, indent=2))
    else:
        print_human(reports, args.mode, args.strict)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
