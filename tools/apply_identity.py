#!/usr/bin/env python3
"""Stamp the shared Food as Infrastructure layer into every page.

Safe to re-run: each insertion sits between fai markers and is replaced
rather than duplicated.

    python3 tools/apply_identity.py            # all pages in assets/fai/pages.json
    python3 tools/apply_identity.py index.html # one page

What it does per page:
  1. Swaps any Google Fonts <link>/@import for Schibsted Grotesk.
  2. Adds the favicon and links assets/fai/fai.css last in <head>.
  3. Inserts the site bar straight after <body> (after a skip link if present).
  4. Removes the dead darkmatterlabs.org logo hotlink.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets" / "fai" / "pages.json"

FONT_HREF = (
    "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:"
    "ital,wght@0,400..900;1,400..700&display=swap"
)

HEAD_BLOCK = f"""<!-- fai:head -->
<link rel="icon" href="assets/fai/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONT_HREF}">
<link rel="stylesheet" href="assets/fai/fai.css">
<!-- /fai:head -->"""

DEAD_LOGO = re.compile(
    r'<img[^>]*DmLogoFull[^>]*>\s*(<span class="brand-div">/</span>)?', re.I
)
GOOGLE_LINK = re.compile(
    r'\s*<link[^>]+(fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>', re.I
)
GOOGLE_IMPORT = re.compile(r"@import\s+url\([^)]*fonts\.googleapis[^)]*\);?", re.I)


def element_tile(page):
    classes = ["fai-el"]
    if page["scope"] == "camden":
        classes.append("fai-el--camden")
    if page["status"] == "draft":
        classes.append("fai-el--draft")
    return (
        f'<span class="{" ".join(classes)}" aria-hidden="true">'
        f'<b>{page["sym"]}</b><i>{page["n"]}</i></span>'
    )


def site_bar(page):
    is_home = page["file"] == "index.html"

    def link(href, label):
        current = ' aria-current="page"' if href == page["file"] else ""
        return f'<a href="{href}"{current}>{label}</a>'

    here = ""
    if not is_home:
        here = (
            f'\n    <span class="fai-bar__here">{element_tile(page)}'
            f'<span>{html.escape(page["name"])}</span></span>'
        )
    return f"""<!-- fai:bar -->
<div class="fai-bar">
  <div class="fai-bar__inner">
    <a class="fai-bar__dm" href="https://darkmatterlabs.org/"><img class="fai-bar__lockup" src="assets/brand/dm-logo-v1-white.svg" alt="Dark Matter Labs" width="102" height="20"><img class="fai-bar__stamp" src="assets/brand/dm-stamp-white.svg" alt="Dark Matter Labs" width="20" height="20"></a>
    <span class="fai-bar__sep" aria-hidden="true"></span>
    <a class="fai-bar__mission" href="index.html">Food as Infrastructure</a>{here}
    <div class="fai-bar__links" role="navigation" aria-label="Site">{link("index.html", "Portfolio")}{link("library.html", "Library")}</div>
  </div>
</div>
<!-- /fai:bar -->"""


def replace_or_insert(src, marker, block, insert):
    pattern = re.compile(rf"<!-- {marker} -->.*?<!-- /{marker} -->", re.S)
    if pattern.search(src):
        return pattern.sub(lambda _: block, src, count=1)
    return insert(src, block)


def insert_head(src, block):
    return src.replace("</head>", f"{block}\n</head>", 1)


def insert_bar(src, block):
    body = re.search(r"<body[^>]*>", src)
    if not body:
        raise ValueError("no <body>")
    pos = body.end()
    skip = re.match(r'\s*<a class="skip-?link"[^>]*>.*?</a>', src[pos:], re.S)
    if skip:
        pos += skip.end()
    return f"{src[:pos]}\n{block}{src[pos:]}"


def apply(page):
    path = ROOT / page["file"]
    src = path.read_text(encoding="utf-8")
    out = GOOGLE_LINK.sub("", src)
    out = GOOGLE_IMPORT.sub("", out)
    out = DEAD_LOGO.sub("", out)
    out = replace_or_insert(out, "fai:head", HEAD_BLOCK, insert_head)
    out = replace_or_insert(out, "fai:bar", site_bar(page), insert_bar)
    if out != src:
        path.write_text(out, encoding="utf-8")
        return "updated"
    return "unchanged"


def main(argv):
    pages = json.loads(MANIFEST.read_text())["pages"]
    wanted = set(argv[1:])
    for page in pages:
        if wanted and page["file"] not in wanted:
            continue
        try:
            print(f'{apply(page):9} {page["file"]}')
        except (OSError, ValueError) as err:
            print(f'FAILED    {page["file"]}: {err}', file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
