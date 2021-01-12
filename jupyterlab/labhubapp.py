# coding: utf-8
"""A JupyterHub EntryPoint that defaults to use JupyterLab"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterhub.singleuser import SingleUserNotebookApp


class SingleUserLabApp(SingleUserNotebookApp):
    default_url = '/lab'


def main(argv=None):
    return SingleUserLabApp.launch_instance(argv)


if __name__ == "__main__":
    main()
