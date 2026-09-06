# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""Provide consistent URL destinations for TypeDoc."""

import sys
from pathlib import Path

HERE = Path(__file__).parent.resolve()
ROOT = HERE.parent
#: a basic HTTP redirect
REDIRECT = """<meta http-equiv="refresh" content="0; URL='{}'" />"""
UTF8 = {"encoding": "utf-8"}
DOCS_API = ROOT / "docs/source/api"

MODULE_INDEXES = sorted(DOCS_API.glob("modules/*.html"))
DASH_HTML = sorted(DOCS_API.rglob("*.html"))


def add_package_indexes():
    """Create ``pkg-name/index.html`` redirects to ``module/pkg-name/``.

    Added in 4.4.0a1
    """
    created = 0
    for html in MODULE_INDEXES:
        stem = html.stem.replace("_", "-")
        mod_dir = DOCS_API / stem
        pkg_json = ROOT / f"packages/{stem}/package.json"
        if pkg_json.exists() and not mod_dir.exists():
            out_html = mod_dir / "index.html"
            mod_dir.mkdir()
            out_html.write_text(REDIRECT.format(f"../modules/{stem}.html"), **UTF8)
            created += 1
    sys.stdout.write(f"... {created} docs/api/source/<package-name>.html")


def add_underscore_redirects():
    """Create ``pkg_name.rest.html`` redirects to  ``pkg-name.rest.html``

    TypeDoc 0.27.0 uses less aggressive normalization:
    - see https://github.com/TypeStrong/typedoc/issues/2714

    Added in 4.4.0a1
    """
    created = 0
    for html in DASH_HTML:
        new_stem, rest = html.name.split(".", 1)
        old_stem = new_stem.replace("-", "_")
        out_html = html.parent / f"{old_stem}.{rest}"
        pkg_json = ROOT / f"packages/{new_stem}/package.json"
        if pkg_json.exists() and not out_html.exists():
            out_html.write_text(REDIRECT.format(html.name), **UTF8)
            created += 1
    sys.stdout.write(f"... {created} pkg_name.rest.html -> pkg-name.rest.html")


def main() -> int:
    sys.stdout.write("fixing TypeDoc URLs:")
    add_package_indexes()
    add_underscore_redirects()

    return 0


if __name__ == "__main__":
    sys.exit(main())
