# Making pages that don't read as AI

Notes for anyone using Claude to produce pages for food.darkmatterlabs.org, or a similar site for their own work.

## Why generated pages look generated

Pages look "AI" for two reasons. The model reaches for the same defaults every time. And each page gets a fresh set of those defaults, so a site built this way ends up with five visual systems.

The defaults are easy to spot once you know them:

- a cream background, a serif headline and a terracotta button
- or a black background with one bright orange or green accent
- small monospace labels in tracked capitals above every heading ("WORKING GROUP NOTE — LONDON, 2026")
- metadata joined with middle dots ("Councils · National government · The frontline")
- a `→` after every button label
- identical rounded cards with soft shadows, and glowing gradient blobs
- sections that fade and slide up as you scroll
- one word in the headline underlined or italicised for emphasis

None of these is wrong on its own. Together, and on every page, they say nobody made a choice.

## What fixes it

**1. Don't let Claude write the CSS from scratch.** This is the biggest lever. This repo has one stylesheet (`assets/fai/fai.css`) and a script that stamps it onto every page. When Claude only writes the content and the page-specific layout, the defaults have nowhere to go.

**2. Give it the house style as a file, not a vibe.** `STYLE.md` is a contract: the tokens, the type, the components and a "never" list. In Claude Code, `CLAUDE.md` tells every session to read it first. In claude.ai, put `STYLE.md` in a Project's knowledge so every chat starts with it.

**3. Name the tells you don't want.** "Make it less AI" doesn't work. "No uppercase labels, no monospace, no middle-dot metadata, no arrows on buttons, no scroll animations" does.

**4. Feed it the field.** The least AI thing on the whole site is the hero footage from the Future Food dinner in Calthorpe Community Garden. Real photos, real names, real dates, real quotes and real numbers do more than any styling. Paste in your notes, transcripts and photos, and tell Claude not to invent anything.

**5. Content first, layout second.** Ask for the page as plain text, edit it, then ask for the HTML. It's much easier to catch hype words and vague claims before they're wrapped in design.

**6. Make it check its own work.** Ask Claude to screenshot the page at desktop and phone width and go through the checklist at the bottom of `STYLE.md` before it hands the page back.

## A prompt you can reuse

```
You're adding a page to food.darkmatterlabs.org. Before writing anything,
read STYLE.md and CLAUDE.md and follow them exactly.

The page: <what it is, who it's for, what they should do after reading>.
Source material: <paste notes, quotes, figures, dates, photo paths>.

Rules:
- Use only facts from the source material. Mark anything uncertain as a question.
- Write the copy first as plain text and show it to me before building.
- Link assets/fai/fai.css and use its --fai-* tokens. Don't add fonts or colours.
- Add the page to assets/fai/pages.json, then run tools/apply_identity.py,
  tools/build_library.py and tools/check_links.py.
- Screenshot it at 1280px and 375px and fix anything that breaks the checklist.
```

## When you're adding a new page

1. Add an entry to `assets/fai/pages.json` with a two-letter symbol nobody else has used.
2. Build the page, linking `assets/fai/fai.css`.
3. Run `python3 tools/apply_identity.py`, then `python3 tools/build_library.py`, then `python3 tools/check_links.py`.
