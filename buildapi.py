# Custom build target that removes .js.map files for published
# dist files.
import glob
import os

from hatch_jupyter_builder import npm_builder


def builder(target_name, version, *args, **kwargs):

    npm_builder(target_name, version, *args, **kwargs)

    if version == "editable":
        return

    files = glob.glob("jupyterlab/static/*.js.map")
    for path in files:
        os.remove(path)
