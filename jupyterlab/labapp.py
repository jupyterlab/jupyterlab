# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from notebook.notebookapp import NotebookApp, aliases, flags
from jupyter_core.application import JupyterApp, base_aliases

from traitlets import Bool, Unicode

from ._version import __version__
from .extension import load_jupyter_server_extension
from .commands import build, clean, get_app_dir


build_aliases = dict(base_aliases)
build_aliases['app-dir'] = 'LabBuildApp.app_dir'
build_aliases['name'] = 'LabBuildApp.name'
build_aliases['version'] = 'LabBuildApp.version'


class LabBuildApp(JupyterApp):
    version = __version__
    description = """
    Build the JupyterLab application

    The application is built in the JupyterLab app directory in `/staging`.
    When the build is complete it is put in the JupyterLab app `/static`
    directory, where it is used to serve the application.
    """
    aliases = build_aliases

    app_dir = Unicode('', config=True,
        help="The app directory to build in")

    name = Unicode('JupyterLab', config=True,
        help="The name of the built application")

    version = Unicode('', config=True,
        help="The version of the built application")

    def start(self):
        build(self.app_dir, self.name, self.version)


clean_aliases = dict(base_aliases)
clean_aliases['app-dir'] = 'LabCleanApp.app_dir'


class LabCleanApp(JupyterApp):
    version = __version__
    description = """
    Clean the JupyterLab application

    This will clean the app directory by removing the `staging` and `static`
    directories.
    """
    aliases = clean_aliases

    app_dir = Unicode('', config=True,
        help="The app directory to clean")

    def start(self):
        clean(self.app_dir)


class LabPathApp(JupyterApp):
    version = __version__
    description = """
    Print the configured path to the JupyterLab application

    The path can be configured using the JUPYTERLAB_DIR environment variable.
    """

    def start(self):
        print(get_app_dir())


lab_aliases = dict(aliases)
lab_aliases['app-dir'] = 'LabApp.app_dir'

lab_flags = dict(flags)
lab_flags['core-mode'] = (
    {'LabApp': {'core_mode': True}},
    "Start the app in core mode."
)


class LabApp(NotebookApp):
    version = __version__

    description = """
    JupyterLab - An extensible computational environment for Jupyter.

    This launches a Tornado based HTML Server that serves up an
    HTML5/Javascript JupyterLab client.

    If run in core mode (e.g. `jupyter lab --core-mode`), it will run
    the shipped JupyterLab application with no installed extensions.

    Otherwise, it will run using the assets in the JupyterLab app
    directory (found using `jupyter lab path`), if present.
    If not present, it will fall back to the core application.
    """

    examples = """
        jupyter lab                       # start JupyterLab
        jupyter lab --certfile=mycert.pem # use SSL/TLS certificate
    """

    aliases = lab_aliases
    flags = lab_flags

    subcommands = dict(
        build=(LabBuildApp, LabBuildApp.description.splitlines()[0]),
        clean=(LabCleanApp, LabCleanApp.description.splitlines()[0]),
        path=(LabPathApp, LabPathApp.description.splitlines()[0])
    )

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`")

    app_dir = Unicode('', config=True,
        help="The app directory to launch")

    core_mode = Bool(False, config=True,
        help="Whether to start the app in core mode")

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
