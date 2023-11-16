# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# change the URLs in `./repos.yml`
import json
import os
import pathlib
import shutil
import subprocess
import sys

import doit.tools
from yaml import safe_load

DOIT_CONFIG = {
    "backend": "sqlite3",
    "verbosity": 2,
    "par_type": "thread",
}

os.environ.update(
    NODE_OPTS="--max-old-space-size=4096",
    PIP_DISABLE_PIP_VERSION_CHECK="1",
    PIP_IGNORE_INSTALLED="1",
    PIP_NO_BUILD_ISOLATION="1",
    PIP_NO_DEPENDENCIES="1",
    PYTHONIOENCODING="utf-8",
    PYTHONUNBUFFERED="1",
)

HERE = pathlib.Path(__file__).parent

# don't pollute the global state
LINKS = (HERE / "repos/.yarn-links").resolve()
YARN = ["yarn", "--link-folder", LINKS]
PIP = ["python", "-m", "pip"]

LAB_APP_DIR = pathlib.Path(sys.prefix) / "share/jupyter/lab"
LAB_APP_STATIC = LAB_APP_DIR / "static"
LAB_APP_INDEX = LAB_APP_STATIC / "index.html"

REPOS_YML = HERE / "repos.yml"
REPOS = safe_load(REPOS_YML.read_text())["repos"]
PATHS = {name: HERE / "repos" / name for name in REPOS}


MISSING_LUMINO_DOCS = [
    "default-theme",
    # TODO: https://github.com/jupyterlab/lumino/issues/154
    "polling",
]


def task_lint():
    """lint the source in _this_ repo"""
    all_py = [*HERE.glob("*.py")]
    yield {
        "name": "py",
        "doc": "apply python source formatting and basic checking",
        "file_dep": [*all_py],
        "actions": [do("black", *all_py), do("flake8", "--max-line-length=88", *all_py)],
    }


# add targets to the docstring to include in the dev build.
def task_clone():
    """clone all the repos defined in `repos.yml`"""
    for name, spec in REPOS.items():
        path = PATHS[name]
        config = path / ".git/config"
        head = path / ".git/HEAD"

        yield {
            "name": f"{name}:init",
            "file_dep": [REPOS_YML],
            "actions": []
            if path.exists()
            else [
                (doit.tools.create_folder, [path]),
                do("git", "init", "-b", "work", cwd=path),
                do("git", "remote", "add", "origin", spec["origin"], cwd=path),
                do("git", "config", "user.email", "a11y@jupyter.org", cwd=path),
                do("git", "config", "advice.detachedHead", "false", cwd=path),
            ],
            "targets": [config],
        }

        refs = spec["refs"]
        for i, ref in enumerate(refs):
            task_dep = []
            actions = [do("git", "fetch", "origin", ref["ref"], cwd=path)]
            commit = ref.get("commit") or ref["ref"]
            targets = []
            if i == 0:
                actions += [do("git", "checkout", "-f", commit, cwd=path)]
            else:
                prev = refs[i - 1]
                task_dep += [f"""clone:{name}:fetch:{i-1}:{prev["ref"]}"""]
                actions += [do("git", "merge", "--commit", commit, cwd=path)]

            if i == len(refs) - 1:
                targets = [head]

            yield {
                "name": f"""{name}:fetch:{i}:{ref["ref"]}""",
                "file_dep": [config],
                "targets": targets,
                "task_dep": task_dep,
                "actions": actions,
            }


def task_setup():
    """ensure a working build of repos"""
    for name, path in PATHS.items():
        head = path / ".git/HEAD"
        pkg_json = path / "package.json"

        if pkg_json.exists():
            yield {
                "name": f"{name}:yarn:install",
                "file_dep": [pkg_json, head],
                "actions": [do(*YARN, cwd=path)],
                "targets": yarn_integrity(path),
            }

        setup_py = path / "setup.py"

        if setup_py.exists():
            py_deps = [head, setup_py] + (yarn_integrity(path) if pkg_json.exists() else [])
            yield {
                "name": f"{name}:pip:install",
                "file_dep": py_deps,
                "actions": [
                    do(*PIP, "uninstall", "-y", path.name, cwd=path),
                    do(*PIP, "install", "-e", ".", cwd=path),
                    do(*PIP, "check"),
                ],
            }
            if path == PATHS.get("jupyterlab"):
                yield {
                    "name": f"server:{path.name}",
                    "file_dep": py_deps,
                    "task_dep": [f"setup:{name}:pip:install"],
                    "actions": server_extensions(path),
                }

        if pkg_json.exists():
            yield {
                "name": f"{name}:yarn:build",
                "file_dep": yarn_integrity(path),
                "actions": [do(*YARN, "build", cwd=path)],
                "targets": list(path.glob("packages/*/lib/*.js")),
                **({"task_dep": [f"setup:{name}:pip:install"]} if setup_py.exists() else {}),
            }


def task_link():
    """link yarn packages across the repos"""
    # go to the direction and links the packages.
    lumino = PATHS.get("lumino")
    lab = PATHS.get("jupyterlab")

    if not (lumino and lab):
        return

    for pkg_json in lumino.glob("packages/*/package.json"):
        pkg = pkg_json.parent
        pkg_data = json.loads(pkg_json.read_text(encoding="utf-8"))
        pkg_name = pkg_data["name"]
        out_link = LINKS / pkg_data["name"] / "package.json"
        in_link = lab / f"node_modules/{pkg_name}/package.json"
        yield {
            "name": pkg_name,
            "file_dep": [*yarn_integrity(lumino), *yarn_integrity(lab), pkg_json],
            "actions": [(doit.tools.create_folder, [LINKS]), do(*YARN, "link", cwd=pkg)],
            "targets": [out_link],
        }

        yield {
            "name": f"lab:{pkg_name}",
            "uptodate": [
                doit.tools.config_changed(
                    {pkg_name: (in_link.exists() and in_link.resolve() == pkg_json.resolve())}
                )
            ],
            "file_dep": [out_link],
            "actions": [do(*YARN, "link", pkg_name, cwd=lab)],
        }


def task_app():
    """rebuild apps with live modifications"""
    lab = PATHS.get("jupyterlab")

    if lab:
        dev_mode = lab / "dev_mode"
        dev_static = dev_mode / "static"
        dev_index = dev_static / "index.html"

        yield {
            "name": "build",
            "doc": "do a dev build of the current jupyterlab source",
            "file_dep": [
                *LINKS.glob("*/package.json"),
                *LINKS.glob("*/*/package.json"),
                *sum(
                    [[*repo.glob("packages/*/lib/*.js")] for repo in PATHS.values()],
                    [],
                ),
            ],
            "actions": [
                do(*YARN, "clean", cwd=dev_mode),
                do(*YARN, "build:prod", cwd=dev_mode),
            ],
            "targets": [dev_index],
        }

        yield {
            "name": "deploy",
            "doc": "deploy the build dev application to $PREFIX/share/jupyter/lab",
            "file_dep": [dev_index],
            "actions": [
                lambda: [shutil.rmtree(LAB_APP_DIR, ignore_errors=True), None][-1],
                (doit.tools.create_folder, [LAB_APP_DIR]),
                lambda: [
                    shutil.copytree(dev_mode / subdir, LAB_APP_DIR / subdir)
                    for subdir in ["static", "schemas", "templates", "themes"]
                ]
                and None,
            ],
            "targets": [LAB_APP_INDEX],
        }


def task_docs():
    """build documentation"""
    for path in PATHS.values():
        if not path.exists():
            continue

        if path == PATHS.get("jupyterlab"):
            tsdoc_index = path / "docs/api/index.html"
            yield {
                "name": """jupyterlab:html:typedoc""",
                "doc": "build JupyterLab TypeScript API docs",
                "file_dep": [*path.rglob("src/**/*.ts"), path / "package.json"],
                "actions": [do(*YARN, "docs", cwd=path)],
                "targets": [tsdoc_index],
            }

            lab_docs = path / "docs"
            lab_docs_src = lab_docs / "source"
            conf_py = lab_docs_src / "conf.py"
            yield {
                "name": "jupyterlab:html:sphinx",
                "doc": "build JupyterLab docs (with a sitemap)",
                "file_dep": [
                    tsdoc_index,
                    *lab_docs_src.rglob("*.rst"),
                    *lab_docs_src.rglob("*.css"),
                    *lab_docs_src.rglob("*.js"),
                ],
                "actions": [
                    (patch_sphinx_sitemap, [conf_py]),
                    do(
                        "sphinx-build",
                        "-b",
                        "html",
                        "source",
                        "build/html",
                        cwd=path / "docs",
                    ),
                ],
                "targets": [
                    path / "docs/build/html/.buildinfo",
                    path / "docs/build/html/index.html",
                    path / "docs/build/html/sitemap.xml",
                ],
            }

        if path == PATHS.get("lumino"):
            lm_pkgs = sorted([p.parent for p in path.glob("packages/*/package.json")])
            lm_docs = [
                path / f"docs/api/{p.name}/index.html"
                for p in lm_pkgs
                if p.name not in MISSING_LUMINO_DOCS
            ]
            lm_index = path / "docs/api/index.html"
            yield {
                "name": """lumino:html:typedoc""",
                "doc": "build Lumino TypeScript API docs",
                "file_dep": [*path.rglob("packages/*/src/**/*.ts"), path / "package.json"],
                "targets": lm_docs,
                "actions": [do(*YARN, "docs", cwd=path)],
            }

            lm_index_text = "\n".join(
                [
                    """
                    <!doctype html>
                    <html>
                    <head><title>Lumino API Documentation</title></head>
                    <body><h1>Lumino API Documentation</h1><ul>
                    """,
                    *[
                        f"""
                        <li>
                        <a href="./{p.name}/index.html">{p.name.title()}</a>
                        </li>
                        """
                        for p in lm_pkgs
                        if p.name not in MISSING_LUMINO_DOCS
                    ],
                    """</ul></body></html>""",
                ]
            )

            yield {
                "name": """lumino:html:index""",
                "doc": "build lumino docs index",
                "file_dep": [*lm_docs],
                "actions": [lm_index.write_text(lm_index_text), None],
                "targets": [lm_index],
            }


def task_start():
    """start applications"""
    if "jupyterlab" in REPOS:
        yield {
            "name": "jupyterlab",
            "uptodate": [lambda: False],
            "file_dep": [LAB_APP_INDEX],
            "actions": [run_jupyterlab()],
        }


# utilities


def do(*args, cwd=HERE, **kwargs):
    """wrap a CmdAction for consistency"""
    return doit.tools.CmdAction(list(args), shell=False, cwd=str(pathlib.Path(cwd)))


def yarn_integrity(repo):
    """get the file created after yarn install"""
    return [repo / "node_modules/.yarn-integrity"]


def server_extensions(repo):
    """enable server( )extensions in a repo"""
    enable = ["enable", "--py", repo.name, "--sys-prefix"]
    apps = ["serverextension"], ["server", "extension"]
    return sum(
        [[do("jupyter", *app, *enable), do("jupyter", *app, "list")] for app in apps],
        [],
    )


def run_jupyterlab():
    """start a jupyterlab application"""

    def jupyterlab():
        args = ["jupyter", "lab", "--debug", "--no-browser"]
        proc = subprocess.Popen(args, stdin=subprocess.PIPE)  # noqa: S603

        try:
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            proc.communicate(b"y\n")

        proc.wait()
        return True

    return doit.tools.PythonInteractiveAction(jupyterlab)


def patch_sphinx_sitemap(conf_py):
    text = conf_py.read_text(encoding="utf-8")
    patches = []

    if "html_baseurl" not in text:
        patches += ["html_baseurl = 'https://localhost:8080/docs/'"]

    if "sphinx_sitemap" not in text:
        patches += ["extensions = ['sphinx_sitemap']"]

    if patches:
        patches += ["## patches added by @jupyterlab/accessibility", *patches]
        conf_py.write_text("\n\n".join([text, "", *patches, ""]), encoding="utf-8")
