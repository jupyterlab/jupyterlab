# coding: utf-8
"""Jupyter LabExtension Entry Points."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
import sys
import traceback

from copy import copy

from jupyter_core.application import JupyterApp, base_flags, base_aliases

from traitlets import Bool, Instance, Unicode

from .commands import (
    install_extension, uninstall_extension, list_extensions,
    enable_extension, disable_extension, check_extension,
    link_package, unlink_package, build, get_app_version, HERE,
    update_extension, AppOptions,
)
from .coreconfig import CoreConfig
from .debuglog import DebugLogFileMixin


flags = dict(base_flags)
flags['no-build'] = (
    {'BaseExtensionApp': {'should_build': False}},
    "Defer building the app after the action."
)
flags['clean'] = (
    {'BaseExtensionApp': {'should_clean': True}},
    "Cleanup intermediate files after the action."
)

check_flags = copy(flags)
check_flags['installed'] = (
    {'CheckLabExtensionsApp': {'should_check_installed_only': True}},
    "Check only if the extension is installed."
)

update_flags = copy(flags)
update_flags['all'] = (
    {'UpdateLabExtensionApp': {'all': True}},
    "Update all extensions"
)

uninstall_flags = copy(flags)
uninstall_flags['all'] = (
    {'UninstallLabExtensionApp': {'all': True}},
    "Uninstall all extensions"
)

aliases = dict(base_aliases)
aliases['app-dir'] = 'BaseExtensionApp.app_dir'
aliases['dev-build'] = 'BaseExtensionApp.dev_build'
aliases['minimize'] = 'BaseExtensionApp.minimize'
aliases['debug-log-path'] = 'DebugLogFileMixin.debug_log_path'

install_aliases = copy(aliases)
install_aliases['pin-version-as'] = 'InstallLabExtensionApp.pin'

VERSION = get_app_version()


class BaseExtensionApp(JupyterApp, DebugLogFileMixin):
    version = VERSION
    flags = flags
    aliases = aliases

    # Not configurable!
    core_config = Instance(CoreConfig, allow_none=True)

    app_dir = Unicode('', config=True,
        help="The app directory to target")

    should_build = Bool(True, config=True,
        help="Whether to build the app after the action")

    dev_build = Bool(None, allow_none=True, config=True,
        help="Whether to build in dev mode. Defaults to True (dev mode) if there are any locally linked extensions, else defaults to False (prod mode).")

    minimize = Bool(True, config=True,
        help="Whether to use a minifier during the Webpack build (defaults to True). Only affects production builds.")

    should_clean = Bool(False, config=True,
        help="Whether temporary files should be cleaned up after building jupyterlab")

    def start(self):
        if self.app_dir and self.app_dir.startswith(HERE):
            raise ValueError('Cannot run lab extension commands in core app')
        with self.debug_logging():
            ans = self.run_task()
            if ans and self.should_build:
                parts = ['build']
                parts.append('none' if self.dev_build is None else
                             'dev' if self.dev_build else
                             'prod')
                if self.minimize:
                    parts.append('minimize')
                command = ':'.join(parts)
                app_options = AppOptions(app_dir=self.app_dir, logger=self.log,
                      core_config=self.core_config)
                build(clean_staging=self.should_clean,
                      command=command, app_options=app_options)

    def run_task(self):
        pass

    def _log_format_default(self):
        """A default format for messages"""
        return "%(message)s"


class InstallLabExtensionApp(BaseExtensionApp):
    description = """Install labextension(s)

     Usage

        jupyter labextension install [--pin-version-as <alias,...>] <package...>

    This installs JupyterLab extensions similar to yarn add or npm install.

    Pass a list of comma seperate names to the --pin-version-as flag
    to use as alises for the packages providers. This is useful to
    install multiple versions of the same extension.
    These can be uninstalled with the alias you provided
    to the flag, similar to the "alias" feature of yarn add.
    """
    aliases = install_aliases

    pin = Unicode('', config=True,
        help="Pin this version with a certain alias")

    def run_task(self):
        pinned_versions = self.pin.split(',')
        self.extra_args = self.extra_args or [os.getcwd()]
        return any([
            install_extension(
                arg,
                # Pass in pinned alias if we have it
                pin=pinned_versions[i] if i < len(pinned_versions) else None,
                app_options=AppOptions(
                    app_dir=self.app_dir,
                    logger=self.log,
                    core_config=self.core_config,
                )
            )
            for i, arg in enumerate(self.extra_args)
        ])


class UpdateLabExtensionApp(BaseExtensionApp):
    description = "Update labextension(s)"
    flags = update_flags

    all = Bool(False, config=True,
        help="Whether to update all extensions")

    def run_task(self):
        if not self.all and not self.extra_args:
            self.log.warn('Specify an extension to update, or use --all to update all extensions')
            return False
        app_options = AppOptions(app_dir=self.app_dir, logger=self.log,
            core_config=self.core_config)
        if self.all:
            return update_extension(all_=True, app_options=app_options)
        return any([
            update_extension(name=arg, app_options=app_options)
            for arg in self.extra_args
        ])


class LinkLabExtensionApp(BaseExtensionApp):
    description = """
    Link local npm packages that are not lab extensions.

    Links a package to the JupyterLab build process. A linked
    package is manually re-installed from its source location when
    `jupyter lab build` is run.
    """
    should_build = Bool(True, config=True,
        help="Whether to build the app after the action")

    def run_task(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        options = AppOptions(
            app_dir=self.app_dir, logger=self.log,
            core_config=self.core_config)
        return any([
            link_package(
                arg,
                app_options=options)
            for arg in self.extra_args
        ])


class UnlinkLabExtensionApp(BaseExtensionApp):
    description = "Unlink packages by name or path"

    def run_task(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        options = AppOptions(
            app_dir=self.app_dir, logger=self.log,
            core_config=self.core_config)
        return any([
            unlink_package(
                arg,
                app_options=options)
            for arg in self.extra_args
        ])


class UninstallLabExtensionApp(BaseExtensionApp):
    description = "Uninstall labextension(s) by name"
    flags = uninstall_flags

    all = Bool(False, config=True,
        help="Whether to uninstall all extensions")

    def run_task(self):
        self.extra_args = self.extra_args or [os.getcwd()]
        options = AppOptions(
            app_dir=self.app_dir, logger=self.log,
            core_config=self.core_config)
        return any([
            uninstall_extension(
                arg, all_=self.all,
                app_options=options)
            for arg in self.extra_args
        ])


class ListLabExtensionsApp(BaseExtensionApp):
    description = "List the installed labextensions"

    def run_task(self):
        list_extensions(app_options=AppOptions(
            app_dir=self.app_dir, logger=self.log, core_config=self.core_config))


class EnableLabExtensionsApp(BaseExtensionApp):
    description = "Enable labextension(s) by name"

    def run_task(self):
        app_options = AppOptions(
            app_dir=self.app_dir, logger=self.log, core_config=self.core_config)
        [enable_extension(arg, app_options=app_options) for arg in self.extra_args]


class DisableLabExtensionsApp(BaseExtensionApp):
    description = "Disable labextension(s) by name"

    def run_task(self):
        app_options = AppOptions(
            app_dir=self.app_dir, logger=self.log, core_config=self.core_config)
        [disable_extension(arg, app_options=app_options) for arg in self.extra_args]


class CheckLabExtensionsApp(BaseExtensionApp):
    description = "Check labextension(s) by name"
    flags = check_flags

    should_check_installed_only = Bool(False, config=True,
        help="Whether it should check only if the extensions is installed")

    def run_task(self):
        app_options = AppOptions(
            app_dir=self.app_dir, logger=self.log, core_config=self.core_config)
        all_enabled = all(
            check_extension(
                arg,
                installed=self.should_check_installed_only,
                app_options=app_options)
            for arg in self.extra_args)
        if not all_enabled:
            self.exit(1)


_examples = """
jupyter labextension list                        # list all configured labextensions
jupyter labextension install <extension name>    # install a labextension
jupyter labextension uninstall <extension name>  # uninstall a labextension
"""


class LabExtensionApp(JupyterApp):
    """Base jupyter labextension command entry point"""
    name = "jupyter labextension"
    version = VERSION
    description = "Work with JupyterLab extensions"
    examples = _examples

    subcommands = dict(
        install=(InstallLabExtensionApp, "Install labextension(s)"),
        update=(UpdateLabExtensionApp, "Update labextension(s)"),
        uninstall=(UninstallLabExtensionApp, "Uninstall labextension(s)"),
        list=(ListLabExtensionsApp, "List labextensions"),
        link=(LinkLabExtensionApp, "Link labextension(s)"),
        unlink=(UnlinkLabExtensionApp, "Unlink labextension(s)"),
        enable=(EnableLabExtensionsApp, "Enable labextension(s)"),
        disable=(DisableLabExtensionsApp, "Disable labextension(s)"),
        check=(CheckLabExtensionsApp, "Check labextension(s)"),
    )

    def start(self):
        """Perform the App's functions as configured"""
        super(LabExtensionApp, self).start()

        # The above should have called a subcommand and raised NoStart; if we
        # get here, it didn't, so we should self.log.info a message.
        subcmds = ", ".join(sorted(self.subcommands))
        self.exit("Please supply at least one subcommand: %s" % subcmds)


main = LabExtensionApp.launch_instance

if __name__ == '__main__':
    sys.exit(main())
