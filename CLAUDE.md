# food.darkmatterlabs.org

Static HTML site for Dark Matter Labs' London food-systems work ("Food as Infrastructure"). It's deployed as-is from `main` via GitHub Pages (see `CNAME`), with no build step.

## Before you write or edit any page

1. Read `STYLE.md` in full. It is the design and writing contract and overrides your defaults.
2. Every page links `assets/fai/fai.css` last in `<head>` and uses its `--fai-*` tokens. Don't invent new colours or fonts.
3. New page: add it to `assets/fai/pages.json` (unique two-letter symbol), then run `python3 tools/apply_identity.py`. That inserts the site bar, fonts, favicon and stylesheet. Don't hand-edit anything between `<!-- fai:... -->` markers.
4. Run `python3 tools/build_library.py` to regenerate the library table from `pages.json`. Set `"listed": false` for link-only pages.
   Then run `python3 tools/build_social.py <page>.html` to render its 1200×630 sharing card. Its `<title>`, meta description and Open Graph tags come from the page's `title` and `summary` in `pages.json`, so write those as you'd want them to appear in a link preview.
5. Link pages on this site relatively (`hubs-and-markets-working-group.html`, not the full URL) and without `target="_blank"`. Only external links open in a new tab and carry `↗`.
6. Run `python3 tools/check_links.py` before committing.

`PROMPTING.md` explains why these rules exist, for people briefing Claude outside this repo.

## Preview

`.claude/launch.json` runs `http-server` on port 5959 with caching off.
