# Split: Bananasplit's icons

Every icon in the app comes from here (`@/components/icons`), drawn for Bananasplit. They replace
`lucide-react` and keep its API and names, so `<CalendarDays className="size-4" />` works as before.

## Using them

```tsx
import { CalendarDays, type IconComponent } from "@/components/icons";

<CalendarDays className="size-4" aria-hidden="true" />;
```

- Colour is the text colour (`stroke="currentColor"`); size is a `size-*` class or the `size` prop.
- `strokeWidth` (default 2) and `absoluteStrokeWidth` work as in Lucide; the sidebar draws at 1.75.
- An icon is hidden from screen readers unless you give it an `aria-label`, `title` or `role`.
- Icons have no hooks or context, so they render in server components. A component is still a
  function, so pass one to a client component only from another client component.
- Settings, the sidebar, boards and saved databases store an icon by name ("CheckSquare").
  `index.ts` keeps every name they've stored resolving, under "Second names".

## How they're drawn

- **Grid:** 24 by 24, content inside 2–22 (most bodies 3–21).
- **Stroke:** 2 units, round caps and joins, no fill.
- **Corners:** r3 on anything 12 units or wider, r1.5–2.5 on small boxes. Rounder than Lucide on
  purpose: it matches Bricolage's soft terminals.
- **Circles:** a full circle is r9 at the centre.
- **Seeds:** a detail dot (an "i"'s dot, a bullet, a window, the sun's rays) is a filled circle,
  `seed(cx, cy, r)`, r1–1.75. They're the seeds in the logo.
- **Arrowheads** are 5 units on each side, **chevrons** 5.5: shorter than Lucide's 7 and 6.
- **Badges** (a plus, a check, a clock, a sync) sit in a corner, and the base shape stops short of
  them instead of running underneath ("the split").
- **Files** are rounded sheets with the top corner sliced off, no folded flap.
- **Brand glyphs:** `Core` (the logo as a one-colour icon), `Banana`, and `Loader` (the logo's
  three seeds; spin it with `animate-spin`).

## Adding an icon

Add it to the file in `glyphs/` it belongs with:

```tsx
export const Ladle = /* @__PURE__ */ createIcon(
  "Ladle",
  <>
    <path d="M…" />
    {seed(12, 7)}
  </>,
);
```

Keep the `/* @__PURE__ */` mark so unused icons drop out of the bundle. Check it at 16px as well as
24px: details closer than 2 units fill in at small sizes.
