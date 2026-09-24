#!/usr/bin/env python3
"""Render the library table and page list from assets/fai/pages.json.

    python3 tools/build_library.py

Fills the regions between <!-- fai:library-table --> and
<!-- fai:library-list --> markers in library.html. Everything else on the
page is hand-written.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets" / "fai" / "pages.json"
LIBRARY = ROOT / "library.html"
PDF_DIR = ROOT / "assets" / "library-pdfs"

GROUPS = [
    ("london", "London-wide", "Shared across the alliance under the open-IP position."),
    ("camden", "Camden", "Built for Camden alone. These belong to Camden outright."),
    ("islington", "Islington", "The borough's own pages, built inside the working group."),
    ("hackney", "Hackney", "The borough's own pages, built inside the working group."),
]


def esc(text):
    return html.escape(text, quote=True)


def tile_classes(page):
    classes = ["tile"]
    if page["scope"] == "camden":
        classes.append("tile--camden")
    if page["status"] == "draft":
        classes.append("tile--draft")
    return " ".join(classes)


def tile(page):
    status = "Draft. " if page["status"] == "draft" else ""
    return (
        f'<a class="{tile_classes(page)}" href="{page["file"]}" '
        f'aria-label="{esc(status + page["title"])}">'
        f'<i>{page["n"]}</i><b>{esc(page["sym"])}</b>'
        f'<span>{esc(page.get("short", page["name"]))}</span></a>'
    )


def pdf_link(page):
    if not page.get("pdf"):
        return ""
    stem = Path(page["file"]).stem
    pdf = PDF_DIR / f"{stem}.pdf"
    if not pdf.exists():
        return ""
    size = max(1, round(pdf.stat().st_size / 1024))
    return (
        f'<a class="entry__pdf" href="assets/library-pdfs/{stem}.pdf">'
        f'PDF snapshot, {size} KB</a>'
    )


def entry(page):
    draft = '<span class="entry__draft">Draft</span>' if page["status"] == "draft" else ""
    el = ["fai-el"]
    if page["scope"] == "camden":
        el.append("fai-el--camden")
    if page["status"] == "draft":
        el.append("fai-el--draft")
    return f"""<li class="entry">
          <span class="{" ".join(el)}" style="--el-size:44px" aria-hidden="true"><b>{esc(page["sym"])}</b><i>{page["n"]}</i></span>
          <div class="entry__body">
            <h4><a href="{page["file"]}">{esc(page["title"])}</a>{draft}</h4>
            <p>{esc(page["summary"])}</p>
          </div>
          <div class="entry__links">{pdf_link(page)}</div>
        </li>"""


def listed_in(pages, scope):
    return sorted((p for p in pages if p["listed"] and p["scope"] == scope), key=lambda p: p["n"])


def render_table(pages):
    rows = []
    for scope, label, _ in GROUPS:
        members = listed_in(pages, scope)
        if not members:
            continue
        tiles = "\n        ".join(tile(p) for p in members)
        rows.append(
            f"""<div class="period">
      <h3 class="period__name">{label}</h3>
      <div class="period__tiles">
        {tiles}
      </div>
    </div>"""
        )
    return "\n    ".join(rows)


def render_list(pages):
    blocks = []
    for scope, label, note in GROUPS:
        members = listed_in(pages, scope)
        if not members:
            continue
        items = "\n        ".join(entry(p) for p in members)
        blocks.append(
            f"""<section class="group" id="{scope}" aria-labelledby="{scope}-h">
      <div class="group__head">
        <h3 id="{scope}-h">{label}</h3>
        <p>{note}</p>
      </div>
      <ul class="entries">
        {items}
      </ul>
    </section>"""
        )
    return "\n    ".join(blocks)


def fill(src, marker, content):
    pattern = re.compile(rf"(<!-- {marker} -->).*?(<!-- /{marker} -->)", re.S)
    if not pattern.search(src):
        raise ValueError(f"marker {marker} not found in library.html")
    return pattern.sub(lambda m: f"{m.group(1)}\n    {content}\n    {m.group(2)}", src, count=1)


def main():
    pages = json.loads(MANIFEST.read_text())["pages"]
    symbols = [p["sym"] for p in pages]
    dupes = {s for s in symbols if symbols.count(s) > 1}
    if dupes:
        print(f"Duplicate element symbols in pages.json: {sorted(dupes)}", file=sys.stderr)
        return 1
    src = LIBRARY.read_text(encoding="utf-8")
    out = fill(src, "fai:library-table", render_table(pages))
    out = fill(out, "fai:library-list", render_list(pages))
    count = sum(1 for p in pages if p["listed"])
    out = re.sub(r'(<span data-fai="count">)\d+(</span>)', rf"\g<1>{count}\g<2>", out)
    LIBRARY.write_text(out, encoding="utf-8")
    print(f"library.html: {count} listed pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
