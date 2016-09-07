# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# TODO: import base server app
from jupyter_core.paths import jupyter_path
from notebook.notebookapp import NotebookApp
from traitlets import Dict, List, Unicode


class LabApp(NotebookApp):

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`"
    )

    extra_lab_extensions_path = List(Unicode(), config=True,
        help="""extra paths to look for JupyterLab extensions"""
    )

    lab_extensions = Dict({}, config=True,
        help=("Dict of Python modules to load as notebook server extensions."
              "Entry values can be used to enable and disable the loading of"
              "the extensions.")
    )

    @property
    def lab_extensions_path(self):
        """The path to look for JupyterLab extensions"""
        return self.extra_lab_extensions_path + jupyter_path('lab_extensions')

    def init_webapp(self):
        super(LabApp, self).init_webapp()
        self.web_app.lab_extensions = self.lab_extensions

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
