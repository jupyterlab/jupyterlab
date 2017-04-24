# coding: utf-8
"""Jupyter LabExtension Entry Points."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from __future__ import print_function

import os
import sys

from jupyter_core.application import JupyterApp, base_flags
from traitlets import Bool

from ._version import __version__
from .commands import (
    install_extension, uninstall_extension, list_extensions,
    link_extension, unlink_extension, build
)


flags = dict(base_flags)
flags['no-build'] = (
    {'BaseExtensionApp': {'should_build': False}},
    "Defer building the app after the action."
)


class BaseExtensionApp(JupyterApp):
    version = __version__
    flags = flags

    lab_config_dir = Unicode(ENV_CONFIG_PATH[0], config=True,
        help="The lab configuration directory")

    should_build = Bool(True, config=True,
        help="Whether to build the app after the action")


class InstallLabExtensionApp(BaseExtensionApp):
    description = "Install labextension(s)"

    def start(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        [install_extension(arg) for arg in self.extra_args]
        if self.should_build:
            build()


class LinkLabExtensionApp(BaseExtensionApp):
    description = "Link labextension(s)"

    def start(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        [link_extension(arg) for arg in self.extra_args]
        if self.should_build:
            build()


class UnlinkLabExtensionApp(BaseExtensionApp):
    description = "Unlink labextension(s)"

    def start(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        ans = any([unlink_extension(arg)
                   for arg in self.extra_args])
        if ans and self.should_build:
            build()


class UninstallLabExtensionApp(BaseExtensionApp):
    description = "Uninstall labextension(s)"

    def start(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        ans = any([uninstall_extension(arg)
                   for arg in self.extra_args])
        if ans and self.should_build:
            build()


class ListLabExtensionsApp(BaseExtensionApp):
    description = "Install a labextension"
    should_build = False

    def start(self):
        [print(ext) for ext in list_extensions(self.config_dir)]


_examples = """
jupyter labextension list                        # list all configured labextensions
jupyter labextension install <extension name>    # install a labextension 
jupyter labextension uninstall <extension name>  # uninstall a labextension
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
        list=(ListLabExtensionsApp, "List labextensions"),
        link=(LinkLabExtensionApp, "Link labextension(s)"),
        unlink=(UnlinkLabExtensionApp, "Unlink labextension(s)"),
    )

    def start(self):
        """Perform the App's functions as configured"""
        super(LabExtensionApp, self).start()

        # The above should have called a subcommand and raised NoStart; if we
        # get here, it didn't, so we should self.log.info a message.
        subcmds = ", ".join(sorted(self.subcommands))
        sys.exit("Please supply at least one subcommand: %s" % subcmds)


main = LabExtensionApp.launch_instance
