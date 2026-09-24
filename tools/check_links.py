#!/usr/bin/env python3
"""Check every internal link, anchor and asset on the site.

    python3 tools/check_links.py            # internal only (fast, offline)
    python3 tools/check_links.py --external # also request every external URL

Exits 1 if anything internal is broken. External failures are reported
but don't fail the run, since many publishers block scripted requests.
"""
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_SCHEMES = ("mailto:", "tel:", "data:", "javascript:")
REF = re.compile(r'(?:href|src)=["\']([^"\']+)["\']')
ID = re.compile(r'\bid=["\']([^"\']+)["\']')


def internal_problems(pages):
    ids = {p.name: set(ID.findall(p.read_text(encoding="utf-8"))) for p in pages}
    problems = []
    for page in pages:
        for ref in REF.findall(page.read_text(encoding="utf-8")):
            if ref.startswith(("http://", "https://", "//")) or ref.startswith(SKIP_SCHEMES):
                continue
            if "{" in ref or "'+" in ref:  # template strings inside scripts
                continue
            path, _, frag = ref.partition("#")
            path = path.split("?")[0]
            target = path or page.name
            if path and not (ROOT / path).exists():
                problems.append(f"{page.name}: missing file {ref}")
            elif frag and target.endswith(".html") and frag not in ids.get(target, set()):
                problems.append(f"{page.name}: missing anchor {ref}")
    return problems


def status(url):
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, url
    except Exception as err:  # report every failure mode, never crash the run
        return getattr(err, "code", str(err)), url


def external_problems(pages):
    urls = set()
    for page in pages:
        for ref in REF.findall(page.read_text(encoding="utf-8")):
            if ref.startswith("https://") and "fonts.g" not in ref:
                urls.add(ref)
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(status, sorted(urls)))
    return [f"{code} {url}" for code, url in results if code != 200]


def main(argv):
    pages = sorted(ROOT.glob("*.html"))
    internal = internal_problems(pages)
    for line in internal:
        print("BROKEN", line)
    if "--external" in argv:
        for line in external_problems(pages):
            print("CHECK ", line)
    print(f"{len(pages)} pages, {len(internal)} internal problems")
    return 1 if internal else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
