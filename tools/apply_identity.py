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
  5. Writes the <title>, meta description, canonical URL and Open Graph /
     Twitter sharing tags from pages.json. Run tools/build_social.py to
     render the sharing images they point to.
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

SITE_URL = "https://food.darkmatterlabs.org/"
SITE_NAME = "Food as Infrastructure, Dark Matter Labs"
SUFFIX = "Food as Infrastructure"


def page_url(page):
    return SITE_URL if page["file"] == "index.html" else SITE_URL + page["file"]


def social_image(page):
    """Same naming rule as tools/build_social.py: photo cards are JPEG."""
    ext = "jpg" if page.get("social_photo") else "png"
    return f"{SITE_URL}assets/fai/social/{Path(page['file']).stem}.{ext}"


def document_title(page):
    if page["file"] == "index.html":
        return "Food as Infrastructure: a London-wide portfolio from Dark Matter Labs"
    draft = " (draft)" if page["status"] == "draft" else ""
    return f"{page['title']}{draft} — {SUFFIX}"


def head_block(page):
    a = lambda text: html.escape(text, quote=True)
    title = page.get("social_title", page["title"])
    summary = page["summary"]
    url = page_url(page)
    image = social_image(page)
    alt = f"{title}. {SUFFIX}, Dark Matter Labs."
    kind = "website" if page["file"] == "index.html" else "article"
    return f"""<!-- fai:head -->
<meta name="description" content="{a(summary)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#111112">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="{a(SITE_NAME)}">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{a(title)}">
<meta property="og:description" content="{a(summary)}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{a(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{a(title)}">
<meta name="twitter:description" content="{a(summary)}">
<meta name="twitter:image" content="{image}">
<meta name="twitter:image:alt" content="{a(alt)}">
<link rel="icon" href="assets/fai/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONT_HREF}">
<link rel="stylesheet" href="assets/fai/fai.css">
<!-- /fai:head -->"""


# Hand-written sharing tags are replaced by the generated set above.
OLD_META = re.compile(
    r'\s*<meta\s+(?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>'
    r'|\s*<link\s+rel="canonical"[^>]*>',
    re.I,
)
HEAD_TITLE = re.compile(r"<title>.*?</title>", re.S)


def set_title(src, page):
    head_end = src.index("</head>")
    head, rest = src[:head_end], src[head_end:]
    head = HEAD_TITLE.sub(lambda _: f"<title>{html.escape(document_title(page), quote=False)}</title>", head, count=1)
    return head + rest


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
    head_end = out.index("</head>")
    out = OLD_META.sub("", out[:head_end]) + out[head_end:]
    out = set_title(out, page)
    out = replace_or_insert(out, "fai:head", head_block(page), insert_head)
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
