from pathlib import Path

from schemematch_pipeline.fetch import (
    SOURCES,
    check,
    clean_jina,
    split_header,
    wb_html_to_text,
    with_header,
)

WB_PAGE = """
<html><body>
<nav><a href="#">Help Line numbers</a></nav>
<script>var tracking = "not text";</script>
<div class="col-md-12" style="line-height:20px;">
  <p>The scheme gives a pension.</p>
  <p>Eligibility</p>
  <ul><li>Must be 60   years&nbsp;of age or above</li><li>Must be SC</li></ul>
  <div><p>Nested block</p></div>
</div>
<footer>Copyright</footer>
<div class="lastupdate-bg-r">
  Last updated on: Friday, 26th June, 2026<br>
  Information Source: I&amp;CA
</div>
</body></html>
"""


def test_wb_converter_keeps_body_and_last_updated_only():
    assert wb_html_to_text(WB_PAGE) == (
        "The scheme gives a pension.\n"
        "Eligibility\n"
        "Must be 60 years of age or above\n"
        "Must be SC\n"
        "Nested block\n"
        "Last updated on: Friday, 26th June, 2026\n"
        "Information Source: I&CA\n"
    )


def test_jina_cleaner_drops_images_and_link_bullets():
    md = "Title: X\n![Image 1](https://a/b.png)\n*   [Home](https://x/)\nReal line\n"
    assert clean_jina(md) == "Title: X\nReal line\n"


def test_header_round_trip():
    text = with_header("demo", "https://example.gov.in/x", "how", "2026-10-20", "Body line\n")
    meta, body = split_header(text)
    assert meta["official_url"] == "https://example.gov.in/x"
    assert body == "Body line\n"


def test_every_saved_source_matches_its_hash():
    assert check(SOURCES) == []


def test_check_notices_a_changed_source(tmp_path: Path):
    good = with_header("demo", "https://x.gov.in", "how", "2026-10-20", "Age 60 or above\n")
    (tmp_path / "demo.txt").write_text(good.replace("Age 60", "Age 65"), encoding="utf-8")
    assert check(tmp_path) == ["demo.txt: text changed since it was saved"]
