# Food as Infrastructure: style contract

The house style for every page on food.darkmatterlabs.org. It is written for people and for Claude. If you are generating a page, read all of it before writing any HTML.

Food as Infrastructure is an element of Dark Matter Labs. It borrows DM's canvas, its stamp logic and its restraint, and adds one food colour of its own. Parent system: https://dm-style-guide.vercel.app

## The idea in one line

Every page is a working document from the field, not a product launch. It should look like it was set by a careful civic designer on deadline: calm, specific, and dense with real names, dates and numbers.

## Five rules

1. **Documents on paper, instruments on canvas.** Pages you read (notes, frameworks, borough pages) sit on white `#FFFFFF`. Pages you operate (maps, models, simulators) sit on DM canvas `#111112`, and so does the portfolio front page (`index.html`), which speaks for Dark Matter Labs the way darkmatterlabs.org does. A page is one or the other. A photographic hero band is the only exception.
2. **One accent: beetroot `#8B2252`.** It marks Camden-owned work, key figures and the active state. Data colours live only inside charts and maps.
3. **One typeface: Schibsted Grotesk.** Headlines are large and quiet (weight 500). No monospace, no serif, no second display face.
4. **Labels are sentences.** Sentence case, same face, no letter-spacing, no small caps. Never uppercase via CSS.
5. **The element tile is the only ornament.** No gradient washes, glows, blobs, noise, drop shadows under cards, or scroll-triggered entrances.

## Tokens

All tokens live in `assets/fai/fai.css`. Link it last in `<head>` and use the variables. Don't copy the hex values into pages.

| Token | Value | Use |
|---|---|---|
| `--fai-paper` | `#FFFFFF` | Document background |
| `--fai-field` | `#F2F3EF` | Raised surface on paper: notes, cards, table headers |
| `--fai-ink` | `#111112` | Text on paper. Also DM canvas. |
| `--fai-ink-2` | `#4F504A` | Secondary text, 8.1:1 |
| `--fai-ink-3` | `#6E6F68` | Captions and metadata, 5.1:1 |
| `--fai-rule` | `#DCDDD7` | Hairlines |
| `--fai-rule-strong` | `#B9BAB2` | Control borders |
| `--fai-beet` | `#8B2252` | The accent, 8.6:1 on paper |
| `--fai-beet-tint` | `#F4E6EC` | Beet background tint |
| `--fai-lavender` | `#A28CC6` | DM signature: text selection, and the focus ring on canvas |
| `--fai-canvas` | `#111112` | Instrument background, site bar |
| `--fai-canvas-raised` | `#252424` | Panels on canvas |
| `--fai-on-canvas` / `-2` | `#FFFFFF` / `#A8A8A8` | Text on canvas |

**Data colours** are for charts, maps and diagrams only, never for UI chrome:
supply ochre `#A86A1F`, hub teal `#2E7D6B`, Camden beet `#8B2252`, crisis red `#C23A2B` (crisis only), neutral `#8A8B84`.
On canvas, use the lighter set so marks stay at least 3:1: ochre `#D19A4E`, teal `#5FB39C`, beet `#D4719B`, crisis red `#E0604F`, lavender `#A28CC6`, periwinkle `#737EA5` (maps), neutral `#C9CED3`.

The focus ring is beet on paper. Canvas pages set `html:root{--fai-focus:var(--fai-lavender)}`.

## Type

Schibsted Grotesk, loaded from Google Fonts by `tools/apply_identity.py`.

| Role | Size | Weight | Line height |
|---|---|---|---|
| Display (h1) | `clamp(40px, 6vw, 76px)` | 500 | 1.02 |
| Section (h2) | `clamp(28px, 3.4vw, 40px)` | 500 | 1.1 |
| Sub-section (h3) | 20–22px | 600 | 1.25 |
| Lede | 20–22px | 400 | 1.45, colour `--fai-ink-2` |
| Body | 17px | 400 | 1.6, max 68ch |
| Small, captions, meta | 14px | 400 | 1.45, colour `--fai-ink-3` |

Headline tracking is slightly tight (the stylesheet handles it). Everything else is untracked. Put `class="num"` on table cells that hold figures (or `.tnum` anywhere) for tabular numerals. Don't apply it to whole tables: it spaces out punctuation in text cells.

## The element tile

A solid square with a two-letter symbol and an index in the top-right corner. It comes from the Dm stamp, which DM mints for each new lab and initiative. Every page gets one, listed in `assets/fai/pages.json`.

- **Filled ink** means live and shared across London.
- **Filled beet** means it belongs to Camden (the IP position agreed with the Camden Food Partnership).
- **Outlined** means draft.

```html
<span class="fai-el fai-el--camden" style="--el-size:56px"><b>Nc</b><i>6</i></span>
```

When you add a page, add it to `pages.json` first: pick a symbol nobody else uses, then run `python3 tools/apply_identity.py`.

## Page anatomy

```
┌ site bar (canvas, generated, never edit by hand) ───────────────┐
│ [Dm lockup] | Food as Infrastructure  [Hm2] Hubs & Markets  Portfolio  Library │
├ page nav (paper, sticky, hairline below) ──────────────────────┤
│ Page name                         anchor · anchor · anchor      │
├────────────────────────────────────────────────────────────────┤
│ status note (optional: draft or live-and-editable)             │
│                                                                │
│ Short kicker sentence, 14px ink-3                              │
│ Headline set large                                             │
│ and quiet, left aligned                                        │
│ Lede, two to three lines, ink-2                                │
│ [Primary action]  [Secondary action]                           │
├── section ─────────────────────────────────────────────────────┤
│ H2 left  │ body at 68ch                                        │
└────────────────────────────────────────────────────────────────┘
```

- Left aligned throughout. Centre nothing but a figure.
- Content container is 1200px with a 32px gutter (16px on phones). Prose is capped at 68ch.
- Sections are separated by space (96px desktop, 56px phone) and, where the topic changes, a hairline `--fai-rule`. The dashed road-marking rule is allowed once per page, between major parts. It stands for food treated like roads.

## Components

- **Primary button**: ink background, paper text, 3px radius, 12px by 18px padding, 15px weight 500. Hover: beet background.
- **Secondary button**: transparent, 1px `--fai-rule-strong` border, ink text. Hover: ink border.
- **Links in prose**: ink text, 1px beet underline offset 3px. Hover: beet text.
- **Arrows**: only `↗`, and only on links that leave food.darkmatterlabs.org. No `→` after button labels. No `↓` for in-page jumps.
- **Status note**: `--fai-field` background, 3px left bar (ink when live, beet when draft), 15px text. One per page, at the top.
- **Card**: `--fai-field` background, no border, no shadow, no radius. A 3px top bar only when it encodes scope (beet = Camden).
- **Tags or chips**: 13px, sentence case, 1px `--fai-rule-strong` border, 999px radius. Use them only when they filter or classify.
- **Tables**: hairline rows, `--fai-field` header row, tabular numbers, left-aligned text and right-aligned figures.
- **Diagrams (SVG)**: stroke `--fai-ink-3`, text in Schibsted at 12–14px, fills from the data colours at full strength or as a 14% tint. No drop shadows or gradients.

## Writing

Voice is DM's: systems-minded, inquiry-led, quietly hopeful, plain words for radical ideas.

- Say who, where, when and how much. "Camden Food Partnership, 6 August, 42 people" beats "key stakeholders".
- No hype adjectives (game-changing, powerful, transformative, unlock, leverage, robust, seamless).
- No stacked labels like `DRAFT — A PARTNER WORKSTREAM — HACKNEY`. Write a sentence: "Draft. A working note from the Hackney Food Hub group."
- Don't join metadata with middle dots (`A · B · C`). Use a sentence, a comma list, or separate lines.
- Use em dashes sparingly: no more than one per paragraph, and never in labels.
- Don't use rhetorical triplets or "It's not X, it's Y" constructions.
- Use British English and sentence-case headings.
- Use numbered markers (01, 02, 03) only when the content really is a sequence.

## Never

- Cream or beige backgrounds (`#F1ECDE`, `#F4F1EA`, and anything near them)
- Fraunces, Poppins, Inter, IBM Plex Mono, or any monospace for labels
- Uppercase letter-spaced eyebrows above every heading
- Terracotta or orange accents (the old `#ff5a1f` and `#B4532A`)
- Gradients, glows, glassmorphism, decorative blobs, grain
- Identical rounded cards with soft grey shadows
- Scroll-reveal fade-ups on every section
- Emoji in page chrome

## Checklist before you publish

- [ ] Page is in `assets/fai/pages.json` and `tools/apply_identity.py` has been run
- [ ] Paper or canvas, not both
- [ ] One accent (beet), data colours only inside figures
- [ ] No uppercase labels, no monospace, no `→` on buttons
- [ ] Headline reads as a plain statement, lede under 60 words
- [ ] Every section heading says what the section contains
- [ ] Draft pages carry a status note and an outlined tile
- [ ] Works at 375px wide; keyboard focus is visible
- [ ] All links resolve (see the link check in `tools/check_links.py`)
