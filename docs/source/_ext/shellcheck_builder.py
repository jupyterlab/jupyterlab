# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Sphinx builder to lint shell snippets with shellcheck."""

from __future__ import annotations

import json
import os
import subprocess
import textwrap
from pathlib import Path
from shutil import which
from typing import TYPE_CHECKING

from docutils import nodes
from sphinx.builders import Builder
from sphinx.errors import SphinxError
from sphinx.locale import __
from sphinx.util import logging

if TYPE_CHECKING:
    from sphinx.application import Sphinx

LOGGER = logging.getLogger(__name__)

_LANGUAGE_TO_SHELL = {
    "bash": "bash",
    "console": "bash",
    "dash": "dash",
    "ksh": "ksh",
    "sh": "sh",
    "shell": "bash",
    "shell-session": "bash",
}


class ShellcheckBuilder(Builder):
    """Validate shell code blocks in documentation with shellcheck."""

    name = "shellcheck"
    format = "shellcheck"
    epilog = __("Look for any errors in the above output or in %(outdir)s/output.txt")

    def __init__(self, app: Sphinx, env) -> None:
        super().__init__(app, env)
        self._executable = app.config.shellcheck_executable
        self._prompt = app.config.shellcheck_prompt
        self._output_path = Path(self.outdir) / "output.txt"
        self._output_path.write_text("", encoding="utf-8")

        if which(self._executable) is None:
            msg = f"Shellcheck executable not found: {self._executable}"
            raise SphinxError(msg)
        if len(self._prompt) != 1:
            msg = "shellcheck_prompt must be a single character"
            raise SphinxError(msg)

    def get_target_uri(self, docname: str, typ: str | None = None) -> str:
        return ""

    def get_outdated_docs(self):
        return self.env.found_docs

    def prepare_writing(self, docnames) -> None:
        return

    def write_doc(self, docname: str, doctree) -> None:
        source_path = self.env.doc2path(docname, None)

        for node in doctree.findall(nodes.literal_block):
            language = self._get_language(node)
            if language is None:
                continue

            issues = self._lint(node, language)
            if not issues:
                continue

            self.app.statuscode = 1
            LOGGER.info(source_path)
            self._write_entry(docname, source_path)

            for issue in issues:
                line = int(issue["line"]) + (node.line or 0)
                column = int(issue["column"])
                code = int(issue["code"])
                message = str(issue["message"])
                issue_text = f"Line {line}, column {column} [{code}]: {message}"
                LOGGER.info(issue_text)
                self._write_entry(docname, issue_text)

    def _get_language(self, node: nodes.literal_block) -> str | None:
        language = (node.attributes.get("language") or "").lower()
        if language in _LANGUAGE_TO_SHELL:
            return language

        for class_name in node.attributes.get("classes", []):
            candidate = class_name.lower()
            if candidate in _LANGUAGE_TO_SHELL:
                return candidate

        return None

    def _lint(self, node: nodes.literal_block, language: str) -> list[dict]:
        script = self._script_from_node(node)
        if not script.strip():
            return []

        proc = subprocess.run(  # noqa S603
            [
                self._executable,
                "--color=never",
                "--format=json",
                "--severity=error",
                f"--shell={_LANGUAGE_TO_SHELL[language]}",
                "-",
            ],
            check=False,
            capture_output=True,
            text=True,
            input=script,
        )

        if proc.returncode not in (0, 1):
            detail = proc.stderr.strip() or proc.stdout.strip()
            msg = f"shellcheck failed with exit code {proc.returncode}: {detail}"
            raise SphinxError(msg)

        output = proc.stdout.strip()
        if not output:
            return []

        parsed = json.loads(output)
        if isinstance(parsed, dict):
            comments = parsed.get("comments")
            return comments if isinstance(comments, list) else []
        if isinstance(parsed, list):
            return parsed
        return []

    def _script_from_node(self, node: nodes.literal_block) -> str:
        lines = node.astext().splitlines()
        if not lines:
            return ""

        if any(line.lstrip().startswith(self._prompt) for line in lines):
            script_lines = []
            for line in lines:
                stripped = line.lstrip()
                if stripped.startswith(self._prompt):
                    command = stripped[len(self._prompt) :]
                    script_lines.append(command.removeprefix(" "))
                else:
                    script_lines.append("# output")
            return "\n".join(script_lines) + "\n"

        return textwrap.dedent("\n".join(lines)).strip("\n") + "\n"

    def finish(self) -> None:
        return

    def _write_entry(self, docname: str, entry: str) -> None:
        with self._output_path.open("a", encoding="utf-8") as output:
            output.write(f"{self.env.doc2path(docname, None)}: {entry}{os.linesep}")


def setup(app: Sphinx) -> dict:
    """Register the shellcheck builder."""

    def _disable_intersphinx_for_shellcheck(sphinx_app: Sphinx) -> None:
        if sphinx_app.builder.name == "shellcheck":
            sphinx_app.config.intersphinx_mapping = {}

    app.add_builder(ShellcheckBuilder)
    app.connect("builder-inited", _disable_intersphinx_for_shellcheck, priority=100)
    app.add_config_value("shellcheck_executable", "shellcheck", "env")
    app.add_config_value("shellcheck_prompt", "$", "env")

    return {
        "version": "1.0",
        "parallel_read_safe": True,
        "parallel_write_safe": False,
    }
