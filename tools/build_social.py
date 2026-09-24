#!/usr/bin/env python3
"""Render a 1200×630 social sharing card for every page in pages.json.

    python3 tools/build_social.py            # all pages
    python3 tools/build_social.py index.html # one page

Cards are written to assets/fai/social/<page>.png and referenced by the
Open Graph tags that tools/apply_identity.py adds. Uses headless Chrome;
set CHROME=/path/to/chrome if it isn't in the default macOS location.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets" / "fai" / "pages.json"
TEMPLATE = ROOT / "tools" / "social-card.html"
OUT_DIR = ROOT / "assets" / "fai" / "social"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)
WIDTH, HEIGHT = 1200, 630
JPEG_QUALITY = 80  # photo cards only: keeps them under WhatsApp's ~300 KB preview limit


def image_name(page):
    """Photo cards are JPEG, flat cards are PNG. apply_identity.py uses the same rule."""
    ext = "jpg" if page.get("social_photo") else "png"
    return f"{Path(page['file']).stem}.{ext}"


def card_url(page):
    theme = "photo" if page.get("social_photo") else page.get("surface", "paper")
    params = {
        "sym": page["sym"],
        "n": page["n"],
        "title": page.get("social_title", page["title"]),
        "scope": page["scope"],
        "status": page["status"],
        "theme": theme,
    }
    if page.get("social_photo"):
        params["photo"] = page["social_photo"]
    return f"{TEMPLATE.as_uri()}?{urlencode(params)}"


def render(page, profile_dir):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{Path(page['file']).stem}.render.png"
    cmd = [
        CHROME,
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--allow-file-access-from-files",
        f"--user-data-dir={profile_dir}",
        "--virtual-time-budget=6000",
        f"--window-size={WIDTH},{HEIGHT}",
        f"--screenshot={out}",
        card_url(page),
    ]
    if out.exists():
        out.unlink()
    # Headless Chrome writes the screenshot but doesn't always exit afterwards,
    # so wait for the file to appear and stop changing, then close it.
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    try:
        deadline = time.monotonic() + 60
        last_size = -1
        while time.monotonic() < deadline:
            if proc.poll() is not None and not out.exists():
                raise RuntimeError(proc.stderr.read().strip() or "Chrome exited without a screenshot")
            if out.exists():
                size = out.stat().st_size
                if size and size == last_size:
                    return out
                last_size = size
            time.sleep(0.5)
        raise RuntimeError("timed out waiting for Chrome")
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


def finish(page, rendered):
    """Move the render into place, converting photo cards to JPEG with macOS sips."""
    final = OUT_DIR / image_name(page)
    if final.suffix == ".jpg":
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(JPEG_QUALITY),
             str(rendered), "--out", str(final)],
            check=True, capture_output=True,
        )
        rendered.unlink()
    else:
        rendered.replace(final)
    return final


def main(argv):
    if not Path(CHROME).exists():
        print(f"Chrome not found at {CHROME}. Set CHROME=/path/to/chrome.", file=sys.stderr)
        return 1
    pages = json.loads(MANIFEST.read_text())["pages"]
    wanted = set(argv[1:])
    with tempfile.TemporaryDirectory() as profile_dir:
        for page in pages:
            if wanted and page["file"] not in wanted:
                continue
            try:
                out = finish(page, render(page, profile_dir))
            except (OSError, RuntimeError, subprocess.CalledProcessError) as err:
                print(f"FAILED {page['file']}: {err}", file=sys.stderr)
                return 1
            print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
