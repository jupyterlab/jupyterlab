# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import sys

from jupyter_core.application import JupyterApp

from ._version import __version__
from .commands import (
    install_extension, uninstall_extension, list_extensions
)


class InstallLabExtensionApp(JupyterApp):
    version = __version__
    description = "Install labextension(s)"

    def start(self):
        [install_extension(arg) for arg in self.extra_args]


class UninstallLabExtensionApp(JupyterApp):
    version = __version__
    description = "Uninstall labextension(s)"

    def start(self):
        [uninstall_extension(arg) for arg in self.extra_args]


class ListLabExtensionsApp(JupyterApp):
    version = __version__
    description = "Install a labextension"

    def start(self):
        [print(ext) for ext in list_extensions()]


_examples = """
jupyter labextension list                          # list all configured labextensions
jupyter labextension install --py <packagename>    # install a labextension from a Python package
jupyter labextension uninstall --py <packagename>  # uninstall a labextension in a Python package
"""


class LabExtensionApp(JupyterApp):
    """Base jupyter labextension command entry point"""
    name = "jupyter labextension"
    version = __version__
    description = "Work with JupyterLab extensions"
    examples = _examples

    subcommands = dict(
        install=(InstallLabExtensionApp, "Install labextension(s)"),
        uninstall=(UninstallLabExtensionApp, "Uninstall labextension(s)"),
        list=(ListLabExtensionsApp, "List labextensions")
    )

    def start(self):
        """Perform the App's functions as configured"""
        super(LabExtensionApp, self).start()

        # The above should have called a subcommand and raised NoStart; if we
        # get here, it didn't, so we should self.log.info a message.
        subcmds = ", ".join(sorted(self.subcommands))
        sys.exit("Please supply at least one subcommand: %s" % subcmds)


main = LabExtensionApp.launch_instance
