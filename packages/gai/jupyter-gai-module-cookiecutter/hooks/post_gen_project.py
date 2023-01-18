#!/usr/bin/env python
from pathlib import Path

PROJECT_DIRECTORY = Path.cwd()


def remove_path(path: Path) -> None:
    """Remove the provided path.
    
    If the target path is a directory, remove it recursively.
    """
    if not path.exists():
        return

    if path.is_file():
        path.unlink()
    elif path.is_dir():
        for f in path.iterdir():
            remove_path(f)
        path.rmdir()


if __name__ == "__main__":

    if not "{{ cookiecutter.has_settings }}".lower().startswith("y"):
        remove_path(PROJECT_DIRECTORY / "schema")

    if not "{{ cookiecutter.has_binder }}".lower().startswith("y"):
        remove_path(PROJECT_DIRECTORY / "binder")
        remove_path(PROJECT_DIRECTORY / ".github/workflows/binder-on-pr.yml")

    if not "{{ cookiecutter.test }}".lower().startswith("y"):
        remove_path(PROJECT_DIRECTORY / ".github" / "workflows" / "update-integration-tests.yml")
        remove_path(PROJECT_DIRECTORY / "src" / "__tests__")
        remove_path(PROJECT_DIRECTORY / "ui-tests")
        remove_path(PROJECT_DIRECTORY / "{{ cookiecutter.python_name }}" / "tests")
        remove_path(PROJECT_DIRECTORY / "babel.config.js")
        remove_path(PROJECT_DIRECTORY / "conftest.py")
        remove_path(PROJECT_DIRECTORY / "jest.config.js")
