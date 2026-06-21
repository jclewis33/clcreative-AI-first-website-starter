# Responsive Column System

This project uses a responsive column system built on CSS container queries. It gives you declarative, per-breakpoint control over column counts directly in your HTML — no extra CSS required.

---

## Two Systems, One Project

### 1. Class-based — `u-grid-*`

Simple, automatic. Apply a class and the grid collapses at the standard breakpoints.

```html
<div class="u-grid-3">
  <!-- 3 cols → 2 cols at medium → 1 col at small -->
</div>
```

| Class      | Behavior                                |
| ---------- | --------------------------------------- |
| `u-grid-1` | Always 1 column                         |
| `u-grid-2` | 2 cols → 1 col at 35em                  |
| `u-grid-3` | 3 cols → 2 cols at 50em → 1 col at 35em |
| `u-grid-4` | 4 cols → 2 cols at 50em → 1 col at 35em |

**Use this when** the default collapse behavior is exactly what you want.

---

### 2. Attribute-based — `data-*-columns`

Full control. You specify the column count at every breakpoint tier using HTML attributes.

```html
<div data-large-columns="4" data-medium-columns="2" data-small-columns="1">
  <!-- 4 cols → 2 cols → 1 col -->
</div>
```

**Use this when** you need different column behavior than the class defaults, or when building reusable components that accept column props.

---

## Breakpoint Tiers

These breakpoints measure the **container's width**, not the viewport. This means grids respond to the space they actually have, not the screen size.

| Tier     | Container query    | ~px        |
| -------- | ------------------ | ---------- |
| `large`  | default (no query) | all widths |
| `medium` | `width < 58em`     | ~992px     |
| `small`  | `width < 35em`     | ~560px     |
| `xsmall` | `width < 20em`     | ~320px     |

> **Requires a container ancestor.** Any element with `container-type: inline-size` on a parent works. The `.u-container` class already sets this, so grids placed inside `.u-container` work automatically.

---

## Column Count Reference

`data-large-columns="1"` produces `display: flex` (single-column stack).
`data-large-columns="2"` through `"12"` produce `display: grid` with equal-width columns.

The same rule applies to `data-medium-columns`, `data-small-columns`, and `data-xsmall-columns`.

---

## Examples

### Basic 3-column card grid

```html
<div class="u-container">
  <div data-large-columns="3" data-medium-columns="2" data-small-columns="1">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
  </div>
</div>
```

### Side-by-side layout that stacks on mobile

```html
<div class="u-container">
  <div data-large-columns="2" data-small-columns="1">
    <div>Content</div>
    <div>Sidebar</div>
  </div>
</div>
```

### Asymmetric layout (use CSS grid areas or column spans alongside)

```html
<div data-large-columns="12" data-medium-columns="6" data-small-columns="1">
  ...
</div>
```

---

## Responsive Flags

Every container query tier automatically sets utility flags on all descendant elements (`*`). These flags let you control any CSS property — display, flex-direction, alignment, visibility — at a specific breakpoint **without writing a container query yourself**.

### How flags work

Flags are CSS custom properties. They are `undefined` at larger tiers, so the `var()` fallback controls the default state.

```css
/* Pattern */
property: var(--{flag}-{tier}, fallback-at-larger-sizes);
```

### Available flags

| Flag                  | Value when active           |
| --------------------- | --------------------------- |
| `--flex-{tier}`       | `flex`                      |
| `--none-{tier}`       | `none`                      |
| `--column-{tier}`     | `column`                    |
| `--row-{tier}`        | `row`                       |
| `--start-{tier}`      | `start`                     |
| `--center-{tier}`     | `center`                    |
| `--end-{tier}`        | `end`                       |
| `--unset-{tier}`      | `unset`                     |
| `--relative-{tier}`   | `relative`                  |
| `--responsive-{tier}` | `1` (numeric, for `calc()`) |

Replace `{tier}` with `medium`, `small`, or `xsmall`.

### Flag examples

**Hide an element on small screens:**

```css
.sidebar {
  display: var(--none-small, block);
}
```

**Stack a flex row on medium:**

```css
.hero {
  display: flex;
  flex-direction: var(--column-medium, row);
}
```

**Center-align text on small:**

```css
.intro {
  text-align: var(--center-small, left);
}
```

**Reorder an element on medium:**

```css
.image-first {
  order: var(--first-medium, 0); /* -1 = moves to front */
}
```

**Conditionally apply position: relative on small:**

```css
.overlay-wrapper {
  position: var(--relative-small, static);
}
```

**Use numeric flag in a calc():**

```css
.responsive-padding {
  /* 2rem at large, 1rem at medium and below */
  padding: calc(2rem - var(--responsive-medium, 0) * 1rem);
}
```

---

## How It Works (Architecture)

The system is powered by three pieces:

1. **`container-type: inline-size`** on `.u-container` — establishes the container context that `@container` queries measure against.

2. **`data-large-columns="N"`** on the grid element — sets `--column-count: N` and `display: grid`.

3. **`@container (width < 50em)`** (and 35em, 20em) — at each tier, overrides `--column-count` based on `data-medium-columns` / `data-small-columns` / `data-xsmall-columns`, and sets the utility flags on all `*` descendants.

The shared rule `grid-template-columns: repeat(var(--column-count), minmax(0, 1fr))` always picks up whatever `--column-count` is currently set to, so no per-breakpoint `grid-template-columns` rules are needed.

---

## Source File

`src/styles/base/responsive-columns.css`

Imported in `src/styles/global.css` after `layout.css`.
