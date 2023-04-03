# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import configparser
import json
import re
import shutil
import subprocess
import sys

try:
    import tomllib
except ImportError:
    import tomli as tomllib

try:
    from importlib.resources import files
except ImportError:
    from importlib_resources import files
from pathlib import Path

try:
    from cookiecutter.main import cookiecutter
except ImportError:
    msg = "Please install cookiecutter"
    raise RuntimeError(msg) from None


DEFAULT_COOKIECUTTER_BRANCH = "4.0"

# List of files recommended to be overridden
RECOMMENDED_TO_OVERRIDE = [
    ".github/workflows/binder-on-pr.yml",
    ".github/workflows/build.yml",
    ".github/workflows/check-release.yml",
    ".github/workflows/update-integration-tests.yml",
    "binder/postBuild",
    ".eslintignore",
    ".eslintrc.js",
    ".gitignore",
    ".prettierignore",
    ".prettierrc",
    ".stylelintrc",
    "RELEASE.md",
    "babel.config.js",
    "conftest.py",
    "jest.config.js",
    "pyproject.toml",
    "setup.py",
    "tsconfig.json",
    "tsconfig.test.json",
    "ui-tests/README.md",
    "ui-tests/jupyter_server_test_config.py",
    "ui-tests/package.json",
    "ui-tests/playwright.config.js",
]

JUPYTER_SERVER_REQUIREMENT = re.compile("^jupyter_server([^\\w]|$)")


def update_extension(  # noqa
    target: str, branch: str = DEFAULT_COOKIECUTTER_BRANCH, interactive: bool = True
) -> None:
    """Update an extension to the current JupyterLab

    target: str
        Path to the extension directory containing the extension
    branch: str [default: DEFAULT_COOKIECUTTER_BRANCH]
        Template branch to checkout
    interactive: bool [default: true]
        Whether to ask before overwriting content

    """
    # Input is a directory with a package.json or the current directory
    # Use the cookiecutter as the source
    # Pull in the relevant config
    # Pull in the Python parts if possible
    # Pull in the scripts if possible
    target = Path(target).resolve()
    package_file = target / "package.json"
    pyproject_file = target / "pyproject.toml"
    setup_file = target / "setup.py"
    if not package_file.exists():
        msg = f"No package.json exists in {target!s}"
        raise RuntimeError(msg)

    # Infer the options from the current directory
    with open(package_file) as fid:
        data = json.load(fid)

    python_name = None
    if pyproject_file.exists():
        pyproject = tomllib.loads(pyproject_file.read_text())
        python_name = pyproject.get("project", {}).get("name")

    if python_name is None:
        if setup_file.exists():
            python_name = (
                subprocess.check_output([sys.executable, "setup.py", "--name"], cwd=target)
                .decode("utf8")
                .strip()
            )
        else:
            python_name = data["name"]
            if "@" in python_name:
                python_name = python_name[1:].replace("/", "_").replace("-", "_")

    output_dir = target / "_temp_extension"
    if output_dir.exists():
        shutil.rmtree(output_dir)

    # Build up the cookiecutter args and run the cookiecutter
    author = data.get("author", "<author_name>")
    author_email = "<author_email>"
    if isinstance(author, dict):
        author_name = author.get("name", "<author_name>")
        author_email = author.get("email", author_email)
    else:
        author_name = author

    kind = "frontend"
    if (target / "jupyter-config").exists():
        kind = "server"
    elif data.get("jupyterlab", {}).get("themePath", ""):
        kind = "theme"

    has_test = (
        (target / "conftest.py").exists()
        or (target / "jest.config.js").exists()
        or (target / "ui-tests").exists()
    )

    extra_context = {
        "kind": kind,
        "author_name": author_name,
        "author_email": author_email,
        "labextension_name": data["name"],
        "python_name": python_name,
        "project_short_description": data.get("description", "<description>"),
        "has_settings": "y" if data.get("jupyterlab", {}).get("schemaDir", "") else "n",
        "has_binder": "y" if (target / "binder").exists() else "n",
        "test": "y" if has_test else "n",
        "repository": data.get("repository", {}).get("url", "<repository"),
    }

    template = "https://github.com/jupyterlab/extension-cookiecutter-ts"
    cookiecutter(
        template=template,
        checkout=branch,
        output_dir=output_dir,
        extra_context=extra_context,
        no_input=not interactive,
    )

    for element in output_dir.glob("*"):
        python_name = element.name
        break

    # hoist the output up one level
    shutil.move(output_dir / python_name, output_dir / "_temp")
    for filename in (output_dir / "_temp").glob("*"):
        shutil.move(filename, output_dir / filename.name)
    shutil.rmtree(output_dir / "_temp")

    # From the created package.json grab the devDependencies
    with (output_dir / "package.json").open() as fid:
        temp_data = json.load(fid)

    if data.get("devDependencies"):
        for key, value in temp_data["devDependencies"].items():
            data["devDependencies"][key] = value
    else:
        data["devDependencies"] = temp_data["devDependencies"].copy()

    # Ask the user whether to upgrade the scripts automatically
    warnings = []
    choice = input("Overwrite scripts in package.json? [n]: ") if interactive else "y"
    if choice.upper().startswith("Y"):
        warnings.append("Updated scripts in package.json")
        data.setdefault("scripts", {})
        for key, value in temp_data["scripts"].items():
            data["scripts"][key] = value
        if "install-ext" in data["scripts"]:
            del data["scripts"]["install-ext"]
    else:
        warnings.append("package.json scripts must be updated manually")

    # Set the output directory
    data["jupyterlab"]["outputDir"] = temp_data["jupyterlab"]["outputDir"]

    # Look for resolutions in JupyterLab metadata and upgrade those as well
    root_jlab_package = files("jupyterlab").joinpath("staging/package.json")
    with root_jlab_package.open() as fid:
        root_jlab_data = json.load(fid)

    data.setdefault("dependencies", {})
    data.setdefault("devDependencies", {})
    for key, value in root_jlab_data["resolutions"].items():
        if key in data["dependencies"]:
            data["dependencies"][key] = value.replace("~", "^")
        if key in data["devDependencies"]:
            data["devDependencies"][key] = value.replace("~", "^")

    # Sort the entries
    for key in ["scripts", "dependencies", "devDependencies"]:
        if data[key]:
            data[key] = dict(sorted(data[key].items()))
        else:
            del data[key]

    # Update style settings
    data.setdefault("styleModule", "style/index.js")
    if isinstance(data.get("sideEffects"), list) and "style/index.js" not in data["sideEffects"]:
        data["sideEffects"].append("style/index.js")
    if "files" in data and "style/index.js" not in data["files"]:
        data["files"].append("style/index.js")

    # Update the root package.json file
    package_file.write_text(json.dumps(data, indent=2))

    override_pyproject = False
    # For the other files, ask about whether to override (when it exists)
    # At the end, list the files that were: added, overridden, skipped
    for p in output_dir.rglob("*"):
        relpath = p.relative_to(output_dir)
        if relpath.name == "package.json":
            continue
        if p.is_dir():
            continue
        file_target = target / relpath
        if not file_target.exists():
            file_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(p, file_target)
            if file_target.name == "pyproject.toml":
                override_pyproject = True
        else:
            old_data = p.read_bytes()
            new_data = file_target.read_bytes()
            if old_data == new_data:
                continue
            default = "y" if relpath.as_posix() in RECOMMENDED_TO_OVERRIDE else "n"
            choice = (
                (input(f'overwrite "{relpath!s}"? [{default}]: ') or default)
                if interactive
                else "n"
            )
            if choice.upper().startswith("Y"):
                shutil.copy(p, file_target)
                if file_target.name == "pyproject.toml":
                    override_pyproject = True
            else:
                warnings.append(f"skipped _temp_extension/{relpath!s}")

    if override_pyproject:
        if (target / "setup.cfg").exists():
            try:
                import tomli_w
            except ImportError:
                msg = "To update pyproject.toml, you need to install tomli_w"
                print(msg)
            else:
                config = configparser.ConfigParser()
                with (target / "setup.cfg").open() as setup_cfg_file:
                    config.read_file(setup_cfg_file)

                pyproject_file = target / "pyproject.toml"
                pyproject = tomllib.loads(pyproject_file.read_text())

                # Backport requirements
                requirements_raw = config.get('options', 'install_requires', fallback=None)
                if requirements_raw is not None:
                    requirements = list(
                        filter(
                            lambda r: r and JUPYTER_SERVER_REQUIREMENT.match(r) is None,
                            requirements_raw.splitlines(),
                        )
                    )

                pyproject["project"]["dependencies"] = (
                    pyproject["project"].get("dependencies", []) + requirements
                )

                # Backport extras
                if config.has_section('options.extras_require'):
                    for extra, deps_raw in config.items('options.extras_require'):
                        deps = list(filter(lambda r: r, deps_raw.splitlines()))
                        if extra in pyproject["project"].get("optional-dependencies", {}):
                            if pyproject["project"].get("optional-dependencies") is None:
                                pyproject["project"]["optional-dependencies"] = {}
                            deps = pyproject["project"]["optional-dependencies"][extra] + deps
                        pyproject["project"]["optional-dependencies"][extra] = deps

                pyproject_file.write_text(tomli_w.dumps(pyproject))
                (target / "setup.cfg").unlink()
                warnings.append("DELETED setup.cfg")

        manifest_in = target / "MANIFEST.in"
        if manifest_in.exists():
            manifest_in.unlink()
            warnings.append("DELETED MANIFEST.in")

    # Print out all warnings
    for warning in warnings:
        print("**", warning)

    print("** Remove _temp_extensions directory when finished")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Upgrade a JupyterLab extension")

    parser.add_argument("--no-input", action="store_true", help="whether to prompt for information")

    parser.add_argument("path", action="store", type=str, help="the target path")

    parser.add_argument(
        "--branch", help="the template branch to checkout", default=DEFAULT_COOKIECUTTER_BRANCH
    )

    args = parser.parse_args()

    update_extension(args.path, args.branch, args.no_input is False)
