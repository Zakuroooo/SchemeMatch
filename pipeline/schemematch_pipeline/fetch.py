"""Save official scheme pages as text with a sha256 header, and check saved copies for changes.

usage:
  uv run python -m schemematch_pipeline.fetch --check
  uv run python -m schemematch_pipeline.fetch <slug> <url> --method wb|jina [--out sources]

Two cleaners, both proven on pages already in sources/:
  wb   - direct fetch of a wb.gov.in scheme page, HTML converted to text
         (re-converting Taposili Bandhu gives a byte-identical file)
  jina - text extraction through Jina Reader (r.jina.ai), image and link noise dropped
"""

import argparse
import datetime
import hashlib
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

PIPELINE = Path(__file__).resolve().parents[1]
SOURCES = PIPELINE / "sources"
HOW = {
    "wb": "direct fetch, HTML converted to text",
    "jina": "via Jina Reader text extraction",
}
_BLOCK = {"p", "li", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "ul", "ol", "table"}
_NOISE = re.compile(r"^\s*(!\[|\[!\[|\*\s+\[.*\]\(http)")


class _WbParser(HTMLParser):
    """Keeps the scheme body (div styled line-height:20px) and the last-updated box."""

    def __init__(self):
        super().__init__()
        self.out, self.depth, self.on, self.skip = [], 0, False, 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self.skip += 1
        starts_body = "line-height:20px" in (a.get("style") or "")
        if not self.on and tag == "div" and (starts_body or a.get("class") == "lastupdate-bg-r"):
            self.on, self.depth = True, 0
        if self.on:
            if tag == "div":
                self.depth += 1
            if tag in _BLOCK:
                self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1
        if self.on:
            if tag in _BLOCK:
                self.out.append("\n")
            if tag == "div":
                self.depth -= 1
                if self.depth == 0:
                    self.on = False

    def handle_data(self, data):
        if self.on and not self.skip:
            self.out.append(data)


def wb_html_to_text(html: str) -> str:
    p = _WbParser()
    p.feed(html)
    text = "".join(p.out).replace("\xa0", " ")
    lines = (re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n"))
    return "\n".join(line for line in lines if line) + "\n"


def clean_jina(markdown: str) -> str:
    lines = [line for line in markdown.splitlines() if not _NOISE.match(line)]
    return "\n".join(lines).strip() + "\n"


def sha256(body: str) -> str:
    return hashlib.sha256(body.encode()).hexdigest()


def with_header(slug: str, url: str, how: str, retrieved: str, body: str) -> str:
    return (
        f"# Source copy for {slug}\n# official_url: {url}\n# retrieved: {retrieved} ({how})\n"
        f"# sha256 of the text below: {sha256(body)}\n"
        "# This is a copy of public government text, kept so quotes can be checked offline.\n\n"
        + body
    )


def split_header(text: str) -> tuple[dict[str, str], str]:
    """Header lines start with '# '; the body starts after the first blank line."""
    head, _, body = text.partition("\n\n")
    meta = {}
    for line in head.splitlines():
        key, sep, value = line.removeprefix("# ").partition(": ")
        if sep:
            meta[key] = value
    return meta, body


def check(directory: Path = SOURCES) -> list[str]:
    """Return one problem line per saved source whose body no longer matches its sha256."""
    problems = []
    for path in sorted(directory.glob("*.txt")):
        meta, body = split_header(path.read_text(encoding="utf-8"))
        recorded = meta.get("sha256 of the text below")
        if recorded is None:
            problems.append(f"{path.name}: no sha256 header")
        elif recorded != sha256(body):
            problems.append(f"{path.name}: text changed since it was saved")
    return problems


def fetch(slug: str, url: str, method: str, out: Path = SOURCES) -> Path:
    import httpx  # only needed when fetching

    headers = {"User-Agent": "Mozilla/5.0 (SchemeMatch source copy)"}
    if method == "wb":
        html = httpx.get(url, headers=headers, timeout=60, follow_redirects=True).text
        body = wb_html_to_text(html)
    else:
        body = clean_jina(httpx.get(f"https://r.jina.ai/{url}", timeout=90).text)
    path = out / f"{slug}.txt"
    today = datetime.date.today().isoformat()
    path.write_text(with_header(slug, url, HOW[method], today, body), encoding="utf-8")
    return path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="re-hash every saved source")
    ap.add_argument("--dir", type=Path, default=SOURCES)
    ap.add_argument("slug", nargs="?")
    ap.add_argument("url", nargs="?")
    ap.add_argument("--method", choices=HOW, default="jina")
    args = ap.parse_args(argv)
    if args.check:
        problems = check(args.dir)
        count = len(list(args.dir.glob("*.txt")))
        print("\n".join(problems) or f"all {count} sources match their sha256")
        return 1 if problems else 0
    if not (args.slug and args.url):
        ap.error("give <slug> <url>, or --check")
    print(fetch(args.slug, args.url, args.method, args.dir))
    return 0


if __name__ == "__main__":
    sys.exit(main())
