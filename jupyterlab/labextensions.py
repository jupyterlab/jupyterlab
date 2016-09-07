# coding: utf-8
"""Utilities for installing Javascript extensions for the notebook"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

import glob
import json
import os
import shutil
import sys
import tarfile
import zipfile
from os.path import basename, join as pjoin, normpath

try:
    from urllib.parse import urlparse  # Py3
    from urllib.request import urlretrieve
except ImportError:
    from urlparse import urlparse
    from urllib import urlretrieve

from jupyter_core.paths import (
    jupyter_data_dir, jupyter_config_dir, jupyter_config_path,
    SYSTEM_JUPYTER_PATH, ENV_JUPYTER_PATH, ENV_CONFIG_PATH, SYSTEM_CONFIG_PATH
)
from ipython_genutils.path import ensure_dir_exists
from ipython_genutils.py3compat import string_types, cast_unicode_py2
from ipython_genutils.tempdir import TemporaryDirectory
from ._version import __version__

from traitlets.config.manager import BaseJSONConfigManager
from traitlets.utils.importstring import import_item

from tornado.log import LogFormatter

# Constants for pretty print extension listing function.
# Window doesn't support coloring in the commandline
GREEN_ENABLED = '\033[32m enabled \033[0m' if os.name != 'nt' else 'enabled '
RED_DISABLED = '\033[31mdisabled\033[0m' if os.name != 'nt' else 'disabled'

GREEN_OK = '\033[32mOK\033[0m' if os.name != 'nt' else 'ok'
RED_X = '\033[31m X\033[0m' if os.name != 'nt' else ' X'

#------------------------------------------------------------------------------
# Public API
#------------------------------------------------------------------------------


class ArgumentConflict(ValueError):
    pass


def check_lab_extension(files, user=False, prefix=None, lab_extensions_dir=None, sys_prefix=False):
    """Check whether lab_extension files have been installed
    
    Returns True if all files are found, False if any are missing.

    Parameters
    ----------
    files : list(paths)
        a list of relative paths within lab_extensions.
    user : bool [default: False]
        Whether to check the user's .jupyter/lab_extensions directory.
        Otherwise check a system-wide install (e.g. /usr/local/share/jupyter/lab_extensions).
    prefix : str [optional]
        Specify install prefix, if it should differ from default (e.g. /usr/local).
        Will check prefix/share/jupyter/lab_extensions
    lab_extensions_dir : str [optional]
        Specify absolute path of lab_extensions directory explicitly.
    sys_prefix : bool [default: False]
        Install into the sys.prefix, i.e. environment
    """
    lab_ext = _get_lab_extension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, lab_extensions_dir=lab_extensions_dir)
    # make sure lab_extensions dir exists
    if not os.path.exists(lab_ext):
        return False
    
    if isinstance(files, string_types):
        # one file given, turn it into a list
        files = [files]
    
    return all(os.path.exists(pjoin(lab_ext, f)) for f in files)


def install_lab_extension(path, name, overwrite=False, symlink=False,
                        user=False, prefix=None, lab_extensions_dir=None,
                        logger=None, sys_prefix=False
                        ):
    """Install a Javascript extension for the notebook
    
    Stages files and/or directories into the lab_extensions directory.
    By default, this compares modification time, and only stages files that need updating.
    If `overwrite` is specified, matching files are purged before proceeding.
    
    Parameters
    ----------
    path : path to file, directory, zip or tarball archive, or URL to install
        Archives (zip or tarballs) will be extracted into the lab_extensions directory.
    name : str [optional]
        name the lab_extension is installed to.  For example, if name is 'foo', then
        the source file will be installed to 'lab_extensions/foo'.
    overwrite : bool [default: False]
        If True, always install the files, regardless of what may already be installed.
    symlink : bool [default: False]
        If True, create a symlink in lab_extensions, rather than copying files.
        Not allowed with URLs or archives. Windows support for symlinks requires
        Vista or above, Python 3, and a permission bit which only admin users
        have by default, so don't rely on it.
    user : bool [default: False]
        Whether to install to the user's lab_extensions directory.
        Otherwise do a system-wide install (e.g. /usr/local/share/jupyter/lab_extensions).
    prefix : str [optional]
        Specify install prefix, if it should differ from default (e.g. /usr/local).
        Will install to ``<prefix>/share/jupyter/lab_extensions``
    lab_extensions_dir : str [optional]
        Specify absolute path of lab_extensions directory explicitly.
    logger : Jupyter logger [optional]
        Logger instance to use
    """

    # the actual path to which we eventually installed
    full_dest = None

    lab_ext = _get_lab_extension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, lab_extensions_dir=lab_extensions_dir)
    # make sure lab_extensions dir exists
    ensure_dir_exists(lab_ext)
    
    # forcing symlink parameter to False if os.symlink does not exist (e.g., on Windows machines running python 2)
    if not hasattr(os, 'symlink'):
        symlink = False
    
    if isinstance(path, (list, tuple)):
        raise TypeError("path must be a string pointing to a single extension to install; call this function multiple times to install multiple extensions")
    
    path = cast_unicode_py2(path)

    if path.startswith(('https://', 'http://')):
        raise NotImplementedError('Urls are not yet supported for lab_extensions')
    elif path.endswith('.zip') or _safe_is_tarfile(path):
        raise NotImplementedError('Archive files are not yet supported for lab_extensions')
    else:
        destination = cast_unicode_py2(name)
        full_dest = normpath(pjoin(lab_ext, destination))
        if overwrite and os.path.lexists(full_dest):
            if logger:
                logger.info("Removing: %s" % full_dest)
            if os.path.isdir(full_dest) and not os.path.islink(full_dest):
                shutil.rmtree(full_dest)
            else:
                os.remove(full_dest)

        if symlink:
            path = os.path.abspath(path)
            if not os.path.exists(full_dest):
                if logger:
                    logger.info("Symlinking: %s -> %s" % (full_dest, path))
                os.symlink(path, full_dest)
        elif os.path.isdir(path):
            path = pjoin(os.path.abspath(path), '') # end in path separator
            for parent, dirs, files in os.walk(path):
                dest_dir = pjoin(full_dest, parent[len(path):])
                if not os.path.exists(dest_dir):
                    if logger:
                        logger.info("Making directory: %s" % dest_dir)
                    os.makedirs(dest_dir)
                for file in files:
                    src = pjoin(parent, file)
                    dest_file = pjoin(dest_dir, file)
                    _maybe_copy(src, dest_file, logger=logger)
        else:
            src = path
            _maybe_copy(src, full_dest, logger=logger)

    return full_dest


def install_lab_extension_python(module, overwrite=False, symlink=False,
                        user=False, sys_prefix=False, prefix=None, lab_extensions_dir=None, logger=None):
    """Install an lab_extension bundled in a Python package.

    Returns a list of installed/updated directories.

    See install_lab_extension for parameter information."""
    m, lab_exts = _get_lab_extension_metadata(module)
    base_path = os.path.split(m.__file__)[0]

    full_dests = []

    for lab_ext in lab_exts:
        src = os.path.join(base_path, lab_ext['src'])
        name = lab_ext['name']

        if logger:
            logger.info("Installing %s -> %s" % (src, name))
        full_dest = install_lab_extension(
            src, name, overwrite=overwrite, symlink=symlink,
            user=user, sys_prefix=sys_prefix, prefix=prefix, lab_extensions_dir=lab_extensions_dir,
            logger=logger
            )
        validate_lab_extension_folder(full_dest, logger)
        full_dests.append(full_dest)

    return full_dests


def uninstall_lab_extension(name, user=False, sys_prefix=False, prefix=None, 
                          lab_extensions_dir=None, logger=None):
    """Uninstall a Javascript extension of the notebook
    
    Removes staged files and/or directories in the lab_extensions directory and 
    removes the extension from the frontend config.
    
    Parameters
    ----------
    name: str
        The name of the lab_extension.
    user : bool [default: False]
        Whether to install to the user's lab_extensions directory.
        Otherwise do a system-wide install (e.g. /usr/local/share/jupyter/lab_extensions).
    prefix : str [optional]
        Specify install prefix, if it should differ from default (e.g. /usr/local).
        Will install to ``<prefix>/share/jupyter/lab_extensions``
    lab_extensions_dir : str [optional]
        Specify absolute path of lab_extensions directory explicitly.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    lab_ext = _get_lab_extension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, lab_extensions_dir=lab_extensions_dir)
    dest = cast_unicode_py2(name)
    full_dest = pjoin(lab_ext, dest)
    if os.path.lexists(full_dest):
        if logger:
            logger.info("Removing: %s" % full_dest)
        if os.path.isdir(full_dest) and not os.path.islink(full_dest):
            shutil.rmtree(full_dest)
        else:
            os.remove(full_dest)
    disable_lab_extension(name)


def uninstall_lab_extension_python(module,
                        user=False, sys_prefix=False, prefix=None, lab_extensions_dir=None,
                        logger=None):
    """Uninstall an lab_extension bundled in a Python package.
    
    See parameters of `install_lab_extension_python`
    """
    m, lab_exts = _get_lab_extension_metadata(module)
    for lab_ext in lab_exts:
        name = lab_ext['name']
        if logger:
            logger.info("Uninstalling {} {}".format(name))
        uninstall_lab_extension(name, user=user, sys_prefix=sys_prefix, 
            prefix=prefix, lab_extensions_dir=lab_extensions_dir, logger=logger)


def _set_lab_extension_state(name, state,
                           user=True, sys_prefix=False, logger=None):
    """Set whether the JupyterLab frontend should use the named lab_extension

    Returns True if the final state is the one requested.

    Parameters
    name : string
        The name of the extension.
    state : bool
        The state in which to leave the extension
    user : bool [default: True]
        Whether to update the user's .jupyter/lab_extensions directory
    sys_prefix : bool [default: False]
        Whether to update the sys.prefix, i.e. environment. Will override
        `user`.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    user = False if sys_prefix else user
    config_dir = os.path.join(
        _get_config_dir(user=user, sys_prefix=sys_prefix), 'nbconfig')
    cm = BaseJSONConfigManager(config_dir=config_dir)
    if logger:
        logger.info("{} extension {}...".format(
            "Enabling" if state else "Disabling",
            name
        ))
    cfg = cm.get("jupyter_notebook_config")
    lab_extensions = (
        cfg.setdefault("LabApp", {})
        .setdefault("lab_extensions", {})
    )

    old_enabled = lab_extensions.get(name, None)
    new_enabled = state if state is not None else not old_enabled

    if logger:
        if new_enabled:
            logger.info(u"Enabling: %s" % (name))
        else:
            logger.info(u"Disabling: %s" % (name))

    lab_extensions[name] = new_enabled

    if logger:
        logger.info(u"- Writing config: {}".format(config_dir))

    cm.update("jupyter_notebook_config", cfg)

    if new_enabled:
        validate_lab_extension(name, logger=logger)

    return old_enabled == state


def _set_lab_extension_state_python(state, module, user, sys_prefix,
                                  logger=None):
    """Enable or disable some lab_extensions stored in a Python package

    Returns a list of whether the state was achieved (i.e. changed, or was
    already right)

    Parameters
    ----------

    state : Bool
        Whether the extensions should be enabled
    module : str
        Importable Python module exposing the
        magic-named `_jupyter_lab_extension_paths` function
    user : bool
        Whether to enable in the user's lab_extensions directory.
    sys_prefix : bool
        Enable/disable in the sys.prefix, i.e. environment
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    m, lab_exts = _get_lab_extension_metadata(module)
    return [_set_lab_extension_state(name=lab_ext["name"],
                                   state=state,
                                   user=user, sys_prefix=sys_prefix,
                                   logger=logger)
            for lab_ext in lab_exts]


def enable_lab_extension(name, user=True, sys_prefix=False,
                       logger=None):
    """Enable a named lab_extension

    Returns True if the final state is the one requested.

    Parameters
    ----------
    name : string
        The name of the extension.
    user : bool [default: True]
        Whether to enable in the user's lab_extensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_lab_extension_state(name=name,
                                  state=True,
                                  user=user, sys_prefix=sys_prefix,
                                  logger=logger)


def disable_lab_extension(name, user=True, sys_prefix=False,
                        logger=None):
    """Disable a named lab_extension
    
    Returns True if the final state is the one requested.

    Parameters
    ----------
    name : string
        The name of the extension.
    user : bool [default: True]
        Whether to enable in the user's lab_extensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_lab_extension_state(name=name,
                                  state=False,
                                  user=user, sys_prefix=sys_prefix,
                                  logger=logger)


def enable_lab_extension_python(module, user=True, sys_prefix=False,
                              logger=None):
    """Enable some lab_extensions associated with a Python module.

    Returns a list of whether the state was achieved (i.e. changed, or was
    already right)

    Parameters
    ----------

    module : str
        Importable Python module exposing the
        magic-named `_jupyter_lab_extension_paths` function
    user : bool [default: True]
        Whether to enable in the user's lab_extensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_lab_extension_state_python(True, module, user, sys_prefix,
                                         logger=logger)


def disable_lab_extension_python(module, user=True, sys_prefix=False,
                               logger=None):
    """Disable some lab_extensions associated with a Python module.

    Returns True if the final state is the one requested.

    Parameters
    ----------
    module : str
        Importable Python module exposing the
        magic-named `_jupyter_lab_extension_paths` function
    user : bool [default: True]
        Whether to enable in the user's lab_extensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_lab_extension_state_python(False, module, user, sys_prefix,
                                         logger=logger)


def validate_lab_extension(name, logger=None):
    """Validate a named lab_extension.

    Looks across all of the lab_extension directories.

    Returns a list of warnings.

    Parameters
    ----------
    name : str
        The name of the extension.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    for exts in _lab_extension_dirs():
        full_dest = os.path.join(exts, name)
        if os.path.exists(full_dest):
            return validate_lab_extension_folder(full_dest)


def validate_lab_extension_folder(name, full_dest, logger=None):
    """Assess the health of an installed lab_extension

    Returns a list of warnings.

    Parameters
    ----------
    full_dest : str
        The on-disk location of the installed lab_extension: this should end
        with `lab_extensions/<name>`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    if logger:
        logger.info("    - Validating...")

    infos = []
    warnings = []

    hasFiles = True
    hasEntry = False
    manifest_files = glob.glob(os.path.join(full_dest, '*.manifest'))
    if not manifest_files:
        hasFiles = False
    for file in manifest_files:
        with open(file) as fid:
            manifest = json.load(fid)
        # Make sure there is at least one entry module and that the entry
        # module and listed files are present.
        if ('entry' in manifest and 'modules' in manifest):
            if (manifest['entry'] in manifest['modules']):
                hasEntry = True
        files = manifest.get('files', [])
        if not files:
            hasFiles = False
        for fname in files:
            path = os.path.join(full_dest, fname)
            if not os.path.exists(path):
                hasFiles = False
    entry_msg = u"     {} has {} entry point?"
    name = os.path.basename(full_dest)
    if hasEntry:
        (entry_msg.format(GREEN_OK, name))
    else:
        warnings.append(entry_msg.format(RED_X, name))

    files_msg = u"     {} has necessary files?"
    if hasFiles:
        infos.append(files_msg.format(GREEN_OK, name))
    else:
        warnings.append(files_msg.format(RED_X, name))

    post_mortem = u"      {} {} {}"
    if logger:
        if warnings:
            [logger.info(info) for info in infos]
            [logger.warn(warning) for warning in warnings]
        else:
            logger.info(post_mortem.format(name, "", GREEN_OK))

    return warnings


#----------------------------------------------------------------------
# Applications
#----------------------------------------------------------------------

from traitlets import Bool, Unicode, Any
from jupyter_core.application import JupyterApp

_base_flags = {}
_base_flags.update(JupyterApp.flags)
_base_flags.pop("y", None)
_base_flags.pop("generate-config", None)
_base_flags.update({
    "user" : ({
        "BaseNBExtensionApp" : {
            "user" : True,
        }}, "Apply the operation only for the given user"
    ),
    "system" : ({
        "BaseNBExtensionApp" : {
            "user" : False,
            "sys_prefix": False,
        }}, "Apply the operation system-wide"
    ),
    "sys-prefix" : ({
        "BaseNBExtensionApp" : {
            "sys_prefix" : True,
        }}, "Use sys.prefix as the prefix for installing lab_extensions (for environments, packaging)"
    ),
    "py" : ({
        "BaseNBExtensionApp" : {
            "python" : True,
        }}, "Install from a Python package"
    )
})
_base_flags['python'] = _base_flags['py']

class BaseNBExtensionApp(JupyterApp):
    """Base lab_extension installer app"""
    _log_formatter_cls = LogFormatter
    flags = _base_flags
    version = __version__
    
    user = Bool(False, config=True, help="Whether to do a user install")
    sys_prefix = Bool(False, config=True, help="Use the sys.prefix as the prefix")
    python = Bool(False, config=True, help="Install from a Python package")

    def _log_format_default(self):
        """A default format for messages"""
        return "%(message)s"


flags = {}
flags.update(_base_flags)
flags.update({
    "overwrite" : ({
        "InstallNBExtensionApp" : {
            "overwrite" : True,
        }}, "Force overwrite of existing files"
    ),
    "symlink" : ({
        "InstallNBExtensionApp" : {
            "symlink" : True,
        }}, "Create symlink instead of copying files"
    ),
})

flags['s'] = flags['symlink']

aliases = {
    "prefix" : "InstallNBExtensionApp.prefix",
    "lab_extensions" : "InstallNBExtensionApp.lab_extensions_dir",
    "destination" : "InstallNBExtensionApp.destination",
}

class InstallNBExtensionApp(BaseNBExtensionApp):
    """Entry point for installing notebook extensions"""
    description = """Install Jupyter notebook extensions
    
    Usage
    
        jupyter lab_extension install path|url [--user|--sys-prefix]
    
    This copies a file or a folder into the Jupyter lab_extensions directory.
    If a URL is given, it will be downloaded.
    If an archive is given, it will be extracted into lab_extensions.
    If the requested files are already up to date, no action is taken
    unless --overwrite is specified.
    """
    
    examples = """
    jupyter lab_extension install /path/to/myextension
    """
    aliases = aliases
    flags = flags
    
    overwrite = Bool(False, config=True, help="Force overwrite of existing files")
    symlink = Bool(False, config=True, help="Create symlinks instead of copying files")

    prefix = Unicode('', config=True, help="Installation prefix")
    lab_extensions_dir = Unicode('', config=True,
           help="Full path to lab_extensions dir (probably use prefix or user)")
    destination = Unicode('', config=True, help="Destination for the copy or symlink")

    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyter_notebook_config'
    
    def install_extensions(self):
        """Perform the installation of lab_extension(s)"""
        if len(self.extra_args)>1:
            raise ValueError("Only one lab_extension allowed at a time. "
                         "Call multiple times to install multiple extensions.")

        if self.python:
            install = install_lab_extension_python
            kwargs = {}
        else:
            install = install_lab_extension
            kwargs = {'destination': self.destination}
        
        full_dests = install(self.extra_args[0],
                             overwrite=self.overwrite,
                             symlink=self.symlink,
                             user=self.user,
                             sys_prefix=self.sys_prefix,
                             prefix=self.prefix,
                             lab_extensions_dir=self.lab_extensions_dir,
                             logger=self.log,
                             **kwargs
                            )

        if full_dests:
            self.log.info(
                u"\nTo initialize this lab_extension in the browser every time"
                " JupyterLab loads:\n\n"
                "      jupyter lab_extension enable {}{}{}{}\n".format(
                    self.extra_args[0] if self.python else "<the entry point>",
                    " --user" if self.user else "",
                    " --py" if self.python else "",
                    " --sys-prefix" if self.sys_prefix else ""
                )
            )

    def start(self):
        """Perform the App's function as configured"""
        if not self.extra_args:
            sys.exit('Please specify an lab_extension to install')
        else:
            try:
                self.install_extensions()
            except ArgumentConflict as e:
                sys.exit(str(e))


class UninstallNBExtensionApp(BaseNBExtensionApp):
    """Entry point for uninstalling notebook extensions"""
    version = __version__
    description = """Uninstall Jupyter notebook extensions
    
    Usage
    
        jupyter lab_extension uninstall path/url path/url/entrypoint
        jupyter lab_extension uninstall --py pythonPackageName
    
    This uninstalls an lab_extension.
    """
    
    examples = """
    jupyter lab_extension uninstall dest/dir dest/dir/extensionjs
    jupyter lab_extension uninstall --py extensionPyPackage
    """
    
    aliases = {
        "prefix" : "UninstallNBExtensionApp.prefix",
        "lab_extensions" : "UninstallNBExtensionApp.lab_extensions_dir",
        "require": "UninstallNBExtensionApp.require",
    }
    
    prefix = Unicode('', config=True, help="Installation prefix")
    lab_extensions_dir = Unicode('', config=True, help="Full path to lab_extensions dir (probably use prefix or user)")
    require = Unicode('', config=True, help="require.js module to load.")
    
    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyter_notebook_config'
    
    def uninstall_extensions(self):
        """Uninstall some lab_extensions"""
        kwargs = {
            'user': self.user,
            'sys_prefix': self.sys_prefix,
            'prefix': self.prefix,
            'lab_extensions_dir': self.lab_extensions_dir,
            'logger': self.log
        }
        
        arg_count = 1
        if len(self.extra_args) > arg_count:
            raise ValueError("only one lab_extension allowed at a time.  Call multiple times to uninstall multiple extensions.")
        if len(self.extra_args) < arg_count:
            raise ValueError("not enough arguments")
        
        if self.python:
            uninstall_lab_extension_python(self.extra_args[0], **kwargs)
        else:
            if self.require:
                kwargs['require'] = self.require
            uninstall_lab_extension(self.extra_args[0], **kwargs)
    
    def start(self):
        if not self.extra_args:
            sys.exit('Please specify an lab_extension to uninstall')
        else:
            try:
                self.uninstall_extensions()
            except ArgumentConflict as e:
                sys.exit(str(e))


class ToggleNBExtensionApp(BaseNBExtensionApp):
    """A base class for apps that enable/disable extensions"""
    name = "jupyter lab_extension enable/disable"
    version = __version__
    description = "Enable/disable an lab_extension in configuration."

    user = Bool(True, config=True, help="Apply the configuration only for the current user (default)")
    
    _toggle_value = None

    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyter_notebook_config'
    
    def toggle_lab_extension_python(self, module):
        """Toggle some extensions in an importable Python module.

        Returns a list of booleans indicating whether the state was changed as
        requested.

        Parameters
        ----------
        module : str
            Importable Python module exposing the
            magic-named `_jupyter_lab_extension_paths` function
        """
        toggle = (enable_lab_extension_python if self._toggle_value
                  else disable_lab_extension_python)
        return toggle(module,
                      user=self.user,
                      sys_prefix=self.sys_prefix,
                      logger=self.log)

    def toggle_lab_extension(self, name):
        """Toggle some a named lab_extension by require-able AMD module.

        Returns whether the state was changed as requested.

        Parameters
        ----------
        require : str
            require.js path used to load the lab_extension
        """
        toggle = (enable_lab_extension if self._toggle_value
                  else disable_lab_extension)
        return toggle(name,
                      user=self.user, sys_prefix=self.sys_prefix,
                      logger=self.log)
        
    def start(self):
        if not self.extra_args:
            sys.exit('Please specify an lab_extension/package to enable or disable')
        elif len(self.extra_args) > 1:
            sys.exit('Please specify one lab_extension/package at a time')
        if self.python:
            self.toggle_lab_extension_python(self.extra_args[0])
        else:
            self.toggle_lab_extension(self.extra_args[0])


class EnableNBExtensionApp(ToggleNBExtensionApp):
    """An App that enables lab_extensions"""
    name = "jupyter lab_extension enable"
    description = """
    Enable an lab_extension in frontend configuration.
    
    Usage
        jupyter lab_extension enable [--system|--sys-prefix]
    """
    _toggle_value = True


class DisableNBExtensionApp(ToggleNBExtensionApp):
    """An App that disables lab_extensions"""
    name = "jupyter lab_extension disable"
    description = """
    Enable an lab_extension in frontend configuration.
    
    Usage
        jupyter lab_extension disable [--system|--sys-prefix]
    """
    _toggle_value = None


class ListNBExtensionsApp(BaseNBExtensionApp):
    """An App that lists and validates lab_extensions"""
    name = "jupyter lab_extension list"
    version = __version__
    description = "List all lab_extensions known by the configuration system"
    
    def list_lab_extensions(self):
        """List all the lab_extensions"""
        config_dirs = [os.path.join(p, 'nbconfig') for p in jupyter_config_path()]
        
        print("Known lab_extensions:")
        
        for config_dir in config_dirs:
            cm = BaseJSONConfigManager(parent=self, config_dir=config_dir)
            data = cm.get("jupyter_notebook_config")
            lab_extensions = (
                data.setdefault("NotebookApp", {})
                .setdefault("lab_extensions", {})
            )
            if lab_extensions:
                print(u'config dir: {}'.format(config_dir))
            for name, enabled in lab_extensions.items():
                print(u'    {} {}'.format(
                              name,
                              GREEN_ENABLED if enabled else RED_DISABLED))
                validate_lab_extension(name, self.log)

    def start(self):
        """Perform the App's functions as configured"""
        self.list_lab_extensions()


_examples = """
jupyter lab_extension list                          # list all configured lab_extensions
jupyter lab_extension install --py <packagename>    # install an lab_extension from a Python package
jupyter lab_extension enable --py <packagename>     # enable all lab_extensions in a Python package
jupyter lab_extension disable --py <packagename>    # disable all lab_extensions in a Python package
jupyter lab_extension uninstall --py <packagename>  # uninstall an lab_extension in a Python package
"""

class NBExtensionApp(BaseNBExtensionApp):
    """Base jupyter lab_extension command entry point"""
    name = "jupyter lab_extension"
    version = __version__
    description = "Work with Jupyter notebook extensions"
    examples = _examples

    subcommands = dict(
        install=(InstallNBExtensionApp,"Install an lab_extension"),
        enable=(EnableNBExtensionApp, "Enable an lab_extension"),
        disable=(DisableNBExtensionApp, "Disable an lab_extension"),
        uninstall=(UninstallNBExtensionApp, "Uninstall an lab_extension"),
        list=(ListNBExtensionsApp, "List lab_extensions")
    )

    def start(self):
        """Perform the App's functions as configured"""
        super(NBExtensionApp, self).start()

        # The above should have called a subcommand and raised NoStart; if we
        # get here, it didn't, so we should self.log.info a message.
        subcmds = ", ".join(sorted(self.subcommands))
        sys.exit("Please supply at least one subcommand: %s" % subcmds)

main = NBExtensionApp.launch_instance

#------------------------------------------------------------------------------
# Private API
#------------------------------------------------------------------------------


def _should_copy(src, dest, logger=None):
    """Should a file be copied, if it doesn't exist, or is newer?

    Returns whether the file needs to be updated.

    Parameters
    ----------

    src : string
        A path that should exist from which to copy a file
    src : string
        A path that might exist to which to copy a file
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    if not os.path.exists(dest):
        return True
    if os.stat(src).st_mtime - os.stat(dest).st_mtime > 1e-6:
        # we add a fudge factor to work around a bug in python 2.x
        # that was fixed in python 3.x: http://bugs.python.org/issue12904
        if logger:
            logger.warn("Out of date: %s" % dest)
        return True
    if logger:
        logger.info("Up to date: %s" % dest)
    return False


def _maybe_copy(src, dest, logger=None):
    """Copy a file if it needs updating.

    Parameters
    ----------

    src : string
        A path that should exist from which to copy a file
    src : string
        A path that might exist to which to copy a file
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    if _should_copy(src, dest, logger=logger):
        if logger:
            logger.info("Copying: %s -> %s" % (src, dest))
        shutil.copy2(src, dest)


def _safe_is_tarfile(path):
    """Safe version of is_tarfile, return False on IOError.

    Returns whether the file exists and is a tarfile.

    Parameters
    ----------

    path : string
        A path that might not exist and or be a tarfile
    """
    try:
        return tarfile.is_tarfile(path)
    except IOError:
        return False


def _get_lab_extension_dir(user=False, sys_prefix=False, prefix=None, lab_extensions_dir=None):
    """Return the lab_extension directory specified

    Parameters
    ----------

    user : bool [default: False]
        Get the user's .jupyter/lab_extensions directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/share/jupyter/lab_extensions
    prefix : str [optional]
        Get custom prefix
    lab_extensions_dir : str [optional]
        Get what you put in
    """
    if sum(map(bool, [user, prefix, lab_extensions_dir, sys_prefix])) > 1:
        raise ArgumentConflict("cannot specify more than one of user, sys_prefix, prefix, or lab_extensions_dir")
    if user:
        lab_ext = pjoin(jupyter_data_dir(), u'lab_extensions')
    elif sys_prefix:
        lab_ext = pjoin(ENV_JUPYTER_PATH[0], u'lab_extensions')
    elif prefix:
        lab_ext = pjoin(prefix, 'share', 'jupyter', 'lab_extensions')
    elif lab_extensions_dir:
        lab_ext = lab_extensions_dir
    else:
        lab_ext = pjoin(SYSTEM_JUPYTER_PATH[0], 'lab_extensions')
    return lab_ext


def _lab_extension_dirs():
    """The possible locations of lab_extensions.

    Returns a list of known base extension locations
    """
    return [
        pjoin(jupyter_data_dir(), u'lab_extensions'),
        pjoin(ENV_JUPYTER_PATH[0], u'lab_extensions'),
        pjoin(SYSTEM_JUPYTER_PATH[0], 'lab_extensions')
    ]


def _get_config_dir(user=False, sys_prefix=False):
    """Get the location of config files for the current context

    Returns the string to the enviornment

    Parameters
    ----------

    user : bool [default: False]
        Get the user's .jupyter config directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/etc/jupyter
    """
    user = False if sys_prefix else user
    if user and sys_prefix:
        raise ArgumentConflict("Cannot specify more than one of user or sys_prefix")
    if user:
        lab_ext = jupyter_config_dir()
    elif sys_prefix:
        lab_ext = ENV_CONFIG_PATH[0]
    else:
        lab_ext = SYSTEM_CONFIG_PATH[0]
    return lab_ext


def _get_lab_extension_metadata(module):
    """Get the list of lab_extension paths associated with a Python module.

    Returns a tuple of (the module,             [{
        'name': 'mockextension',
        'src': 'static',
    }])

    Parameters
    ----------

    module : str
        Importable Python module exposing the
        magic-named `_jupyter_lab_extension_paths` function
    """
    m = import_item(module)
    if not hasattr(m, '_jupyter_lab_extension_paths'):
        raise KeyError('The Python module {} is not a valid lab_extension'.format(module))
    lab_exts = m._jupyter_lab_extension_paths()
    return m, lab_exts


def _read_config_data(user=False, sys_prefix=False):
    """Get the config for the current context

    Returns the string to the enviornment

    Parameters
    ----------

    user : bool [default: False]
        Get the user's .jupyter config directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/etc/jupyter
    """
    config_dir = _get_config_dir(user=user, sys_prefix=sys_prefix)
    config_man = BaseJSONConfigManager(config_dir=config_dir)
    return config_man.get('jupyter_notebook_config')


def _write_config_data(data, user=False, sys_prefix=False):
    """Update the config for the current context

    Parameters
    ----------
    data : object
        An object which can be accepted by ConfigManager.update
    user : bool [default: False]
        Get the user's .jupyter config directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/etc/jupyter
    """
    config_dir = _get_config_dir(user=user, sys_prefix=sys_prefix)
    config_man = BaseJSONConfigManager(config_dir=config_dir)
    config_man.update('jupyter_notebook_config', data)


if __name__ == '__main__':
    main()
