# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from notebook.notebookapp import NotebookApp, flags
from jupyter_core.application import JupyterApp

from traitlets import Bool, Unicode

from ._version import __version__
from .extension import load_jupyter_server_extension
from .commands import build, clean, describe


class LabBuildApp(JupyterApp):
    version = __version__
    description = "Build the JupyterLab application"

    def start(self):
        build()


class LabCleanApp(JupyterApp):
    version = __version__
    description = "Clean the JupyterLab application"

    def start(self):
        clean()


class LabDescribeApp(JupyterApp):
    version = __version__
    description = "Git description the JupyterLab application"

    def start(self):
        print(describe())


lab_flags = dict(flags)
lab_flags['dev-mode'] = (
    {'LabApp': {'dev_mode': True}},
    "Start the app in dev mode."
)


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

    flags = lab_flags

    subcommands = dict(
        build=(LabBuildApp, LabBuildApp.description.splitlines()[0]),
        clean=(LabCleanApp, LabCleanApp.description.splitlines()[0]),
        describe=(LabDescribeApp, LabBuildApp.description.splitlines()[0])
    )

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`")

    dev_mode = Bool(False, config=True,
        help="Whether to start the app in dev mode")

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
