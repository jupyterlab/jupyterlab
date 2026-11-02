#!/usr/bin/env python3
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Custom filters for ``sphinxcontrib.spelling``."""

from __future__ import annotations

import re

from enchant.tokenize import Filter

# Ignore identifier-like words common in docs code snippets.
_IDENTIFIER_PATTERN = re.compile(
    r"^(?:"
    r"[a-z]+(?:[A-Z][a-z0-9]+)+|"  # camelCase
    r"[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+|"  # PascalCase
    r"[A-Z]{2,}[A-Za-z0-9]*|"  # acronyms and interface-like tokens
    r"[A-Za-z_]*\d[A-Za-z0-9_]*"  # contains digits
    r")$"
)

_IGNORED_WORDS = {
    "afterAll",
    "beforeAll",
    "beforeEach",
    "afterEach",
}


class CodeIdentifierFilter(Filter):
    """Skip likely code identifiers when spell-checking documentation text."""

    def _skip(self, word: str) -> bool:
        if word in _IGNORED_WORDS:
            return True
        if len(word) <= 1:
            return True
        return bool(_IDENTIFIER_PATTERN.match(word))
