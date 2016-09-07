# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# TODO: import base server app
from jupyter_core.paths import jupyter_path
from notebook.notebookapp import NotebookApp
from traitlets import List, Unicode


class LabApp(NotebookApp):

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`"
    )

    extra_labextensions_path = List(Unicode(), config=True,
        help="""extra paths to look for JupyterLab extensions"""
    )

    @property
    def labextensions_path(self):
        """The path to look for JupyterLab extensions"""
        return self.extra_labextensions_path + jupyter_path('labextensions')

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
