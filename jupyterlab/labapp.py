# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# TODO: import base server app
from notebook.notebookapp import NotebookApp
from traitlets import Unicode


class LabApp(NotebookApp):

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`"
    )

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
