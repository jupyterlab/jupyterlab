# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
from subprocess import check_output
import sys

from notebook.notebookapp import NotebookApp
from jupyter_core.application import JupyterApp

from traitlets import Unicode

from ._version import __version__
from .extension import load_jupyter_server_extension
from .commands import build


class LabBuildApp(JupyterApp):
    version = __version__
    description = "Build the JupyterLab application"

    def start(self):
        build()


class LabDescribeApp(JupyterApp):
    version = __version__
    description = "Git description the JupyterLab application"

    def start(self):
        description = 'unknown'
        try:
            cwd = os.path.dirname(os.path.dirname(__file__))
            shell = sys.platform == 'win32'
            description = check_output(['git', 'describe'],
                                       cwd=cwd, shell=shell)
            description = description.decode('utf8').strip()
        except Exception:
            pass
        print(description)
        return


class LabApp(NotebookApp):
    version = __version__

    description = """
        JupyterLab - An extensible computational environment for Jupyter.

        This launches a Tornado based HTML Server that serves up an
        HTML5/Javascript JupyterLab client.
    """

    examples = """
        jupyter lab                       # start JupyterLab
        jupyter lab --certfile=mycert.pem # use SSL/TLS certificate
    """

    subcommands = dict(
        build=(LabBuildApp, LabBuildApp.description.splitlines()[0]),
        describe=(LabDescribeApp, LabBuildApp.description.splitlines()[0])
    )

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`")

    def init_server_extensions(self):
        """Load any extensions specified by config.

        Import the module, then call the load_jupyter_server_extension function,
        if one exists.

        If the JupyterLab server extension is not enabled, it will
        be manually loaded with a warning.

        The extension API is experimental, and may change in future releases.
        """
        super(LabApp, self).init_server_extensions()
        msg = 'JupyterLab server extension not enabled, manually loading...'
        if not self.nbserver_extensions.get('jupyterlab', False):
            self.log.warn(msg)
            load_jupyter_server_extension(self)

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
