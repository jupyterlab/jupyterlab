# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab.commands import watch_dev

if __name__ == "__main__":
    procs = watch_dev()
    procs[0].wait()
