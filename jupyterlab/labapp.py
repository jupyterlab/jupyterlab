# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# TODO: import base server app
import os
from jupyter_core.paths import jupyter_config_path, jupyter_path
from notebook.notebookapp import NotebookApp
from traitlets import List, Unicode, default
from traitlets.config.manager import BaseJSONConfigManager

def get_labextensions(parent=None):
    """Get the list of enabled lab extensions"""
    extensions = []
    config_dirs = [os.path.join(p, 'labconfig') for p in
                   jupyter_config_path()]
    for config_dir in config_dirs:
        cm = BaseJSONConfigManager(parent=parent, config_dir=config_dir)
        data = cm.get("jupyterlab_config")
        labextensions = (
            data.setdefault("LabApp", {})
            .setdefault("labextensions", {})
        )
        for name, enabled in labextensions.items():
            if enabled:
                extensions.append(name)
    return extensions


class LabApp(NotebookApp):

    description = """
        JupyterLab - An extensible computational environment for Jupyter.

        This launches a Tornado based HTML Server that serves up an
        HTML5/Javascript JupyterLab client.
    """

    examples = """
        jupyter lab                       # start JupyterLab
        jupyter lab --certfile=mycert.pem # use SSL/TLS certificate
    """

    subcommands = dict()

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`"
    )

    extra_labextensions_path = List(Unicode(), config=True,
        help="""extra paths to look for JupyterLab extensions"""
    )
    
    labextensions = List(Unicode())
    
    @default('labextensions')
    def _labextensions_default(self):
        return get_labextensions(parent=self)

    @property
    def labextensions_path(self):
        """The path to look for JupyterLab extensions"""
        return self.extra_labextensions_path + jupyter_path('labextensions')

    def init_webapp(self):
        super(LabApp, self).init_webapp()
        self.web_app.labextensions = self.labextensions

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
