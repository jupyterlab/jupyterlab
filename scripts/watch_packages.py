# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab.commands import watch_packages

if __name__ == "__main__":
    procs = watch_packages()
    procs[0].wait()
