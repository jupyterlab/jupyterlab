# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Custom build target that removes .js.map files for published
# dist files.
import glob
import json
import os
import subprocess

from hatch_jupyter_builder import npm_builder
from packaging.version import Version


def builder(target_name, version, *args, **kwargs):

    # Allow building from sdist without node.
    if target_name == "wheel" and not os.path.exists("dev_mode"):
        return

    npm_builder(target_name, version, *args, **kwargs)

    if version == "editable":
        return

    files = glob.glob("jupyterlab/static/*.js.map")
    for path in files:
        os.remove(path)

    target = glob.glob("jupyterlab/static/package.json")[0]
    with open(target) as fid:
        npm_version = json.load(fid)["jupyterlab"]["version"]

    py_version = subprocess.check_output(["hatchling", "version"])
    py_version = py_version.decode("utf-8").strip()

    if Version(npm_version) != Version(py_version):
        raise ValueError("Version mismatch, please run `npm run prepare:python-release`")
