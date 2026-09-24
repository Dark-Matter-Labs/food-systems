# food.darkmatterlabs.org

Static HTML site for Dark Matter Labs' London food-systems work ("Food as Infrastructure"). It's deployed as-is from `main` via GitHub Pages (see `CNAME`), with no build step.

## Before you write or edit any page

1. Read `STYLE.md` in full. It is the design and writing contract and overrides your defaults.
2. Every page links `assets/fai/fai.css` last in `<head>` and uses its `--fai-*` tokens. Don't invent new colours or fonts.
3. New page: add it to `assets/fai/pages.json` (unique two-letter symbol), then run `python3 tools/apply_identity.py`. That inserts the site bar, fonts, favicon and stylesheet. Don't hand-edit anything between `<!-- fai:... -->` markers.
4. Add the page to `library.html` unless it's meant to be link-only.
5. Run `python3 tools/check_links.py` before committing.

## Preview

`.claude/launch.json` runs `http-server` on port 5959 with caching off.
