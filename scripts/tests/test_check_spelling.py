# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Regression tests for the shared spelling check and its Git/Sphinx integration."""

import argparse
import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.fixture
def spelling():
    path = Path(__file__).resolve().parents[1] / "check_spelling.py"
    spec = importlib.util.spec_from_file_location("check_spelling", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def repo(tmp_path, monkeypatch, spelling):
    root = tmp_path / "repo"
    root.mkdir()

    def git(*args):
        return subprocess.run(  # noqa: S603
            [  # noqa: S607
                "git",
                "-c",
                "user.name=Spelling Test",
                "-c",
                "user.email=spelling@example.invalid",
                "-c",
                "commit.gpgsign=false",
                "-c",
                f"core.hooksPath={tmp_path / 'hooks'}",
                *args,
            ],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout

    git("init")
    docs = root / "docs/source"
    docs.mkdir(parents=True)
    (docs / "conf.py").write_text(
        "extensions = ['myst_parser', 'sphinxcontrib.spelling']\n"
        "source_suffix = {'.md': 'markdown', '.txt': 'restructuredtext'}\n"
        "spelling_word_list_filename = ['spelling_wordlist.txt']\n"
        "spelling_show_suggestions = True\n"
        "exclude_patterns = ['spelling_wordlist.txt', 'docs/source/spelling_wordlist.txt']\n",
        encoding="utf-8",
    )
    (docs / "spelling_wordlist.txt").write_text("Jupyter\n", encoding="utf-8")
    (root / "example.md").write_text(
        "# Title\n\nAn existing qzxoldword.\n\nA correct sentence.\n", encoding="utf-8"
    )
    git("add", ".")
    git("commit", "-m", "Initial documents")
    monkeypatch.setattr(spelling, "ROOT", root)
    monkeypatch.setattr(spelling, "DOCS_SOURCE", docs)
    monkeypatch.setattr(spelling, "SPELLING_WORDLIST", docs / "spelling_wordlist.txt")
    monkeypatch.setattr(sys, "argv", ["check_spelling.py", "--staged"])
    return root, git


@pytest.fixture
def spelling_backend():
    pytest.importorskip("sphinx")
    pytest.importorskip("myst_parser")
    try:
        enchant = importlib.import_module("enchant")
    except ImportError:
        pytest.skip("The native Enchant backend is required")
    else:
        if not enchant.dict_exists("en_US"):
            pytest.skip("An English Enchant dictionary is required")
    pytest.importorskip("sphinxcontrib.spelling")


@pytest.mark.parametrize("location", ["0", "None", "3"])
@pytest.mark.parametrize("suggestions", ["", '["misspelling", "misspelling\u2019s"]'])
def test_report_locations(spelling, tmp_path, location, suggestions):
    source = tmp_path / "source"
    source.mkdir()
    document = source / "example.md"
    document.write_text(
        "# Title\n\n- **Do**: Fix qzxnewword.\n\nAn existing qzxoldword.\n",
        encoding="utf-8",
    )
    build = tmp_path / "build"
    build.mkdir()
    (build / "example.spelling").write_text(
        f"{document}:{location}: (qzxnewword) {suggestions} : Fix qzxnewword.\n"
        f"{document}:0: (qzxoldword) [] An existing qzxoldword.\n",
        encoding="utf-8",
    )

    errors, ignored = spelling.spelling_errors_on_changed_lines(build, source, {"example.md": {3}})
    assert len(errors) == 1
    assert errors[0].startswith("example.md:3:")
    assert "qzxnewword" in errors[0]
    assert ignored == 1


@pytest.mark.parametrize(
    ("content", "report"),
    [
        ("qzxword\nqzxword\n", "example.md:0: (qzxword) [] qzxword"),
        ("qzx&#119;ord\n", "example.md:0: (qzxword) [] qzxword"),
        ("qzxword\n", "example.md:None: (qzxword) [] "),
        ("qzxword\n", "<unknown>:0: (qzxword) [] qzxword"),
        ("qzxword\n", "unrecognized spelling report"),
    ],
)
def test_unmapped_reports_fail(spelling, tmp_path, content, report):
    (tmp_path / "example.md").write_text(content, encoding="utf-8")
    (tmp_path / "example.spelling").write_text(report + "\n", encoding="utf-8")
    errors, ignored = spelling.spelling_errors_on_changed_lines(
        tmp_path, tmp_path, {"example.md": {2}}
    )
    assert errors == [report]
    assert ignored == 0


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ("# Title\n\n++ b/other.md\n+++ b/fake.md\nFinal typo", {3, 4, 5}),
        ("# Title\n\nAn existing qzxoldword.\n", set()),
        ("# Title\n\nAn existing qzxoldword.\n\nA changed sentence.", {5}),
    ],
)
def test_diff_ranges(spelling, repo, content, expected):
    root, git = repo
    (root / "example.md").write_text(content, encoding="utf-8")
    git("add", "example.md")
    changes = spelling.changed_text_document_lines(["--cached"])
    assert changes == ({"example.md": expected} if expected else {})


@pytest.mark.parametrize("staged", [False, True])
def test_dirty_checkout_rejected(spelling, repo, staged):
    root, git = repo
    (root / "example.md").write_text("Changed text\n", encoding="utf-8")
    if staged:
        git("add", "example.md")
    args = argparse.Namespace(staged=False, base="HEAD", head="HEAD")
    with pytest.raises(SystemExit, match="Tracked working tree changes"):
        spelling.validate_non_staged_head(args)


def test_revision_validation(spelling, repo):
    root, git = repo
    (root / "example.md").write_text("Changed text\n", encoding="utf-8")
    git("add", "example.md")
    git("commit", "-m", "Update document")
    args = argparse.Namespace(staged=False, base="HEAD~1", head="HEAD~1")
    with pytest.raises(SystemExit, match="--head resolves to"):
        spelling.validate_non_staged_head(args)
    args.head = "HEAD"
    spelling.validate_non_staged_head(args)


def test_staged_snapshot(spelling, repo, tmp_path):
    root, git = repo
    paths = ["example.md", "docs/source/conf.py", "docs/source/spelling_wordlist.txt", "include.py"]
    for path in paths:
        (root / path).write_text("Staged content\n", encoding="utf-8")
    git("add", ".")
    for path in paths:
        (root / path).write_text("Unstaged content\n", encoding="utf-8")
    source = tmp_path / "snapshot"
    source.mkdir()
    spelling.write_spelling_source(source, ["example.md"], staged=True)
    for path in [*paths, "spelling_wordlist.txt"]:
        assert (source / path).read_text(encoding="utf-8") == "Staged content\n"


@pytest.mark.usefixtures("spelling_backend")
@pytest.mark.parametrize(
    "replacement",
    [
        "A qzxnewword sentence.",
        "- **Do**: Fix qzxnewword.",
        "Correct `code` on this line.\nA qzxnewword sentence.",
        "Correct **bold** on this line.\nA qzxnewword sentence.",
    ],
)
def test_changed_markdown_fails(spelling, repo, capfd, replacement):
    root, git = repo
    document = root / "example.md"
    document.write_text(
        document.read_text(encoding="utf-8").replace("A correct sentence.", replacement),
        encoding="utf-8",
    )
    git("add", "example.md")
    assert spelling.main() == 1
    output = capfd.readouterr().out
    assert "qzxnewword" in output
    assert "qzxoldword" not in output
    line_number = 5 + replacement.count("\n")
    assert f"example.md:{line_number}:" in output


@pytest.mark.usefixtures("spelling_backend")
@pytest.mark.parametrize("staged_typo", [False, True])
def test_only_staged_content_is_checked(spelling, repo, capfd, staged_typo):
    root, git = repo
    document = root / "example.md"
    baseline = document.read_text(encoding="utf-8")
    clean = baseline.replace("A correct sentence.", "A different sentence.")
    typo = baseline.replace("A correct sentence.", "A qzxnewword sentence.")
    document.write_text(typo if staged_typo else clean, encoding="utf-8")
    git("add", "example.md")
    document.write_text(clean if staged_typo else typo, encoding="utf-8")
    assert spelling.main() == int(staged_typo)
    output = capfd.readouterr().out
    assert "qzxoldword" not in output
    if staged_typo:
        assert "qzxnewword" in output
    else:
        assert "Ignored 1 spelling error(s) outside changed lines." in output


@pytest.mark.usefixtures("spelling_backend")
@pytest.mark.parametrize("support_file", ["conf.py", "spelling_wordlist.txt"])
def test_support_changes_check_unchanged_documents(spelling, repo, capfd, support_file):
    root, git = repo
    path = root / "docs/source" / support_file
    path.write_text(path.read_text(encoding="utf-8") + "\n", encoding="utf-8")
    git("add", str(path))
    assert spelling.main() == 1
    output = capfd.readouterr().out
    assert "checking all text documents" in output
    assert "qzxoldword" in output
