# Moonstone: the design system

The redesign (Moonstone) in one page, for anyone building or restyling a
screen. The full rationale, mocks and decisions live in the redesign guide
("Bananasplit Redesign Guide"); this is the working contract.

## Principles

- **Every colour is a theme token.** A club picks five colours (primary,
  accent, background, surface, text) plus an optional glow; everything else
  is derived (`src/lib/theme/derive.ts`). Never use raw colours or palette
  classes (`theme/no-raw-colors` fails them). Moonstone (the default) is
  monochrome graphite and pearl lit by a banana glow, dark first.
- **The logo never changes.** `CoreMark`/`Logo` keep their fixed colours
  (`--color-logo-*`) and Young Serif in every theme.
- **One create action per screen** (`<Button variant="create">`). Primary
  (`variant="default"`) commits: Save, Send, Confirm.
- **One destructive style.** `<Button variant="destructive">` is the red
  button everywhere (forms and confirm dialogs), always naming the thing:
  "Delete task", "Delete event". In menus: a red row
  (`DropdownMenuItem variant="destructive"`).
- **Sentence case everywhere.** No uppercase/mono eyebrows. The `eyebrow`
  utility is a muted 13px label now.
- **Fewer lines.** Separate with space and surface. Hairlines only between
  list rows (inset past the checkbox). Card headers sit on space, not rules.
- **Two control sizes:** 40px (default) and 32px (`sm`). Inputs, selects,
  search, segmented controls, filter chips and buttons line up at 40.
- **Dates:** "Today", "Tomorrow", then "Wed, Oct 14" (add the year only
  outside the current year). Due "Today"/overdue in `text-tint-danger-foreground`,
  "Tomorrow" bold, later dates muted. Money: `$1,830` (cents in tables).
- **Names:** "Tags" (not labels) everywhere in the UI. Plans: Personal Free,
  Personal Plus, Team, Team Advanced.

## Tokens (Tailwind colours)

| Use | Classes |
| --- | --- |
| Page, cards, floats | `bg-background`, `bg-card`, `bg-raised` (dark-mode floats), `bg-popover` |
| Fills | `bg-muted` (tracks, hovers), `bg-muted-strong` (stronger fill), `bg-thumb` (segmented thumb) |
| Text | `text-foreground`, `text-muted-foreground` |
| Accent (create, active nav, today) | `bg-brand-accent text-brand-accent-foreground` (+ `glow-halo`) |
| Glow (light only) | `bg-glow`, `stroke-glow`; halos via `glow-halo`, focus via `focus-glow` |
| Chrome (glass rail, toasts, tab bar, tooltips) | `bg-chrome text-chrome-foreground` |
| Block cards | `bg-block-{quiet,alert,answer,goal}` + `-foreground` + `-meta` |
| Chip tints | `bg-tint-{accent,success,info,danger}` + `text-tint-*-foreground` |
| Avatars | `bg-avatar-{1..5} text-avatar-{1..5}-foreground` (via `UserAvatar`) |
| Charts | `var(--chart-1..5)` in order; slot 1 is the brand colour |
| Status | `text-success`, `text-warning`, `text-destructive` |

## Shape, depth, type

- Corners by role: `rounded-shell` 32 · `rounded-card` 28 (cards, dialogs) ·
  `rounded-block` 24 (block cards, kanban columns) · `rounded-tile` 18 (tiles,
  menus, task cards) · `rounded-field` 14 (inputs, calendar days) ·
  `rounded-full` (buttons, chips, segmented, search). Nested: inner = outer −
  padding. They scale with Look and feel's Corner roundness.
- Depth: `shadow-e1` + top highlight = the `edge` utility (cards) ·
  `shadow-e2` (floats, dragged cards, hovered blocks) · `shadow-e3` (glass).
- Glass (`glass`, `glass-light`): floating chrome only. Never cards, tables
  or long text.
- Type: `page-title` (Bricolage, every page h1) · `display-title` (block
  titles, dialog titles) · `heading` (card/sheet titles, Hanken 600, 17px) ·
  `numeral` (big figures) · `figure` (tabular numbers in text) · `eyebrow`
  (small muted label). JetBrains Mono only for codes and `kbd`.
- Spacing: 4px base; card padding 24 (18 on phones); 18 between cards; 30
  between page sections.

## Components (src/components)

- `ui/button`: variants `default | create | secondary | outline | ghost |
  destructive | link`; sizes `default (40) | sm (32) | icon (40) | icon-sm
  (32) | icon-xs (24, inside fields only)`. Circle icon buttons:
  `variant="outline" size="icon-sm"` (••• and ↗ in card headers).
- `ui/badge`: chips: `default | secondary (counts) | accent | success | info
  | destructive | outline`.
- `ui/chip`: `TagChip` (tag/epic colour mixed into the card; optional
  remove button) and `StatusDot` (dot + word, never a dot alone).
- `ui/block-card`: `BlockCard tone="quiet|alert|answer|goal"` with kicker,
  title, subtitle, figure, figureLabel, aside (avatar stack), action, href.
  Meanings: quiet = coming up, alert = act now, answer = your answer, goal =
  progress. At most six per screen; never two alert blocks side by side.
- `ui/stat`: `StatStrip` + `Stat icon value label chip` (numbers count up
  once) and `IconChip`.
- `ui/meters`: `TickMeter` (one tick per real unit), `Gauge` (270° glow
  arc), `MixBar` (to-scale parts, hatch for "not yet", legend).
- `ui/segmented`: `Segmented` (spring thumb), `segmentedTrack/Item`,
  `chipClass` for filter pills. `ui/page-tabs` for section tabs.
- `page-header`: title (display face), a live one-line summary, actions,
  tabs. `back-link`: circle ← with the parent's name. `empty-state`: the
  section's `icon`, one sentence, one action. `page-skeleton`.
- `user-avatar`: tinted initials, photo when uploaded; stacks overlap by
  8px with a ring in the surface colour, three faces then "+N".

## Patterns

- **Card header:** title (`heading`), optional count `Badge variant="secondary"`,
  spacer, then controls in this order: Segmented, ••• (`ItemMenu`/outline
  icon button), ↗ (open the full page).
- **Task rows:** 22px circle checkbox (fills `bg-block-goal` on done),
  title, meta row (TagChip epic, due label), priority chip on the right
  (Urgent = `destructive` + flag icon, High = `accent`, Normal = nothing).
- **Toasts:** `toast({ title: "Done: Creative brief draft", tone: "success",
  action: { label: "Undo", run } })`. Verb first.
- **Hatch** (`hatch` utility on `bg-muted`): pending, awaiting, not started,
  a drop slot.
- **Motion:** hover lift 2-3px (180-250ms `--ease-ink`), press 97% (circle
  buttons 94%), springs (`--ease-spring`) for thumbs, toasts, checkboxes.
  Everything respects `prefers-reduced-motion`.
- **Icons:** Lucide at stroke 1.75 (the default stroke is fine at 16-20px),
  sizes 16 inline, 20 buttons/nav, 24 stat chips. ↗ = open the full page,
  ••• = more actions, flag = urgent only, filled circle = done.
