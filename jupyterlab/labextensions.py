# coding: utf-8
"""Utilities for installing Javascript extensions for JupyterLab"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

import glob
import json
import os
import shutil
import sys
import tarfile
from os.path import join as pjoin, normpath

from jupyter_core.paths import (
    jupyter_data_dir, jupyter_config_dir, jupyter_config_path, jupyter_path,
    SYSTEM_JUPYTER_PATH, ENV_JUPYTER_PATH, ENV_CONFIG_PATH, SYSTEM_CONFIG_PATH
)
from ipython_genutils.path import ensure_dir_exists
from ipython_genutils.py3compat import string_types, cast_unicode_py2
from ._version import __version__

from traitlets.config.manager import BaseJSONConfigManager
from traitlets.utils.importstring import import_item

from tornado.log import LogFormatter


# Constants for pretty print extension listing function.
# Window doesn't support coloring in the commandline
GREEN_OK = '\033[32mOK\033[0m' if os.name != 'nt' else 'ok'
RED_X = '\033[31mX\033[0m' if os.name != 'nt' else 'X'

GREEN_ENABLED = '\033[32menabled \033[0m' if os.name != 'nt' else 'enabled '
RED_DISABLED = '\033[31mdisabled\033[0m' if os.name != 'nt' else 'disabled'

CONFIG_DIR = 'labconfig'

#------------------------------------------------------------------------------
# Public API
#------------------------------------------------------------------------------


class ArgumentConflict(ValueError):
    pass


def check_labextension(files, user=False, prefix=None, labextensions_dir=None, sys_prefix=False):
    """Check whether labextension files have been installed
    
    Returns True if all files are found, False if any are missing.

    Parameters
    ----------
    files : list(paths)
        a list of relative paths within labextensions.
    user : bool [default: False]
        Whether to check the user's .jupyter/labextensions directory.
        Otherwise check a system-wide install (e.g. /usr/local/share/jupyter/labextensions).
    prefix : str [optional]
        Specify install prefix, if it should differ from default (e.g. /usr/local).
        Will check prefix/share/jupyter/labextensions
    labextensions_dir : str [optional]
        Specify absolute path of labextensions directory explicitly.
    sys_prefix : bool [default: False]
        Install into the sys.prefix, i.e. environment
    """
    labext = _get_labextension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, labextensions_dir=labextensions_dir)
    # make sure labextensions dir exists
    if not os.path.exists(labext):
        return False
    
    if isinstance(files, string_types):
        # one file given, turn it into a list
        files = [files]
    
    return all(os.path.exists(pjoin(labext, f)) for f in files)


def install_labextension(path, name, overwrite=False, symlink=False,
                        user=False, prefix=None, labextensions_dir=None,
                        logger=None, sys_prefix=False
                        ):
    """Install a Javascript extension for JupyterLab
    
    Stages files and/or directories into the labextensions directory.
    By default, this compares modification time, and only stages files that need updating.
    If `overwrite` is specified, matching files are purged before proceeding.
    
    Parameters
    ----------
    path : path to file, directory, zip or tarball archive, or URL to install
        Archives (zip or tarballs) will be extracted into the labextensions directory.
    name : str
        name the labextension is installed to.  For example, if name is 'foo', then
        the source file will be installed to 'labextensions/foo'.
    overwrite : bool [default: False]
        If True, always install the files, regardless of what may already be installed.
    symlink : bool [default: False]
        If True, create a symlink in labextensions, rather than copying files.
        Not allowed with URLs or archives. Windows support for symlinks requires
        Vista or above, Python 3, and a permission bit which only admin users
        have by default, so don't rely on it.
    user : bool [default: False]
        Whether to install to the user's labextensions directory.
        Otherwise do a system-wide install (e.g. /usr/local/share/jupyter/labextensions).
    prefix : str [optional]
        Specify install prefix, if it should differ from default (e.g. /usr/local).
        Will install to ``<prefix>/share/jupyter/labextensions``
    labextensions_dir : str [optional]
        Specify absolute path of labextensions directory explicitly.
    logger : Jupyter logger [optional]
        Logger instance to use
    sys_prefix : bool [default: False]
        Install into the sys.prefix, i.e. environment
    """

    # the actual path to which we eventually installed
    full_dest = None

    labext = _get_labextension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, labextensions_dir=labextensions_dir)

    # make sure labextensions dir exists
    ensure_dir_exists(labext)
    
    # forcing symlink parameter to False if os.symlink does not exist (e.g., on Windows machines running python 2)
    if not hasattr(os, 'symlink'):
        symlink = False
    
    if isinstance(path, (list, tuple)):
        raise TypeError("path must be a string pointing to a single extension to install; call this function multiple times to install multiple extensions")
    
    path = cast_unicode_py2(path)

    if path.startswith(('https://', 'http://')):
        raise NotImplementedError('Urls are not yet supported for labextensions')
    elif path.endswith('.zip') or _safe_is_tarfile(path):
        raise NotImplementedError('Archive files are not yet supported for labextensions')
    else:
        destination = cast_unicode_py2(name)
        full_dest = normpath(pjoin(labext, destination))
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


def install_labextension_python(module, overwrite=False, symlink=False,
                        user=False, sys_prefix=False, prefix=None, labextensions_dir=None, logger=None):
    """Install a labextension bundled in a Python package.

    Returns a list of installed/updated directories.

    See install_labextension for parameter information."""
    m, labexts = _get_labextension_metadata(module)
    base_path = os.path.split(m.__file__)[0]

    full_dests = []

    for labext in labexts:
        src = os.path.join(base_path, labext['src'])
        name = labext['name']

        if logger:
            logger.info("Installing %s -> %s" % (src, name))
        full_dest = install_labextension(
            src, name=name, overwrite=overwrite, symlink=symlink,
            user=user, sys_prefix=sys_prefix, prefix=prefix, labextensions_dir=labextensions_dir,
            logger=logger
            )
        validate_labextension_folder(name, full_dest, logger)
        full_dests.append(full_dest)

    return full_dests


def uninstall_labextension(name, user=False, sys_prefix=False, prefix=None, 
                          labextensions_dir=None, logger=None):
    """Uninstall a Javascript extension of JupyterLab
    
    Removes staged files and/or directories in the labextensions directory and 
    removes the extension from the frontend config.
    
    Parameters
    ----------
    name: str
        The name of the labextension.
    user : bool [default: False]
        Whether to uninstall from the user's labextensions directory.
        Otherwise do a system-wide uninstall (e.g. /usr/local/share/jupyter/labextensions).
    sys_prefix : bool [default: False]
        Uninstall from the sys.prefix, i.e. environment
    prefix : str [optional]
        Specify prefix, if it should differ from default (e.g. /usr/local).
        Will uninstall from ``<prefix>/share/jupyter/labextensions``
    labextensions_dir : str [optional]
        Specify absolute path of labextensions directory explicitly.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    labext = _get_labextension_dir(user=user, sys_prefix=sys_prefix, prefix=prefix, labextensions_dir=labextensions_dir)
    dest = cast_unicode_py2(name)
    full_dest = pjoin(labext, dest)
    if os.path.lexists(full_dest):
        if logger:
            logger.info("Removing: %s" % full_dest)
        if os.path.isdir(full_dest) and not os.path.islink(full_dest):
            shutil.rmtree(full_dest)
        else:
            os.remove(full_dest)
    disable_labextension(name, user=user, sys_prefix=sys_prefix,
                        logger=logger)


def uninstall_labextension_python(module,
                        user=False, sys_prefix=False, prefix=None, labextensions_dir=None,
                        logger=None):
    """Uninstall a labextension bundled in a Python package.
    
    See parameters of `install_labextension_python`
    """
    m, labexts = _get_labextension_metadata(module)
    for labext in labexts:
        name = labext['name']
        if logger:
            logger.info("Uninstalling {}".format(name))
        uninstall_labextension(name, user=user, sys_prefix=sys_prefix, 
            prefix=prefix, labextensions_dir=labextensions_dir, logger=logger)


def _set_labextension_state(name, state,
                           user=True, sys_prefix=False, logger=None,
                           python_module=None):
    """Set whether the JupyterLab frontend should use the named labextension

    Returns True if the final state is the one requested.

    Parameters
    name : string
        The name of the extension.
    state : bool
        The state in which to leave the extension
    user : bool [default: True]
        Whether to update the user's .jupyter/labextensions directory
    sys_prefix : bool [default: False]
        Whether to update the sys.prefix, i.e. environment. Will override
        `user`.
    logger : Jupyter logger [optional]
        Logger instance to use [optional]
    python_module: string
        The name of the python module associated with the extension.
    """
    user = False if sys_prefix else user
    extensions = _read_config_data('labextensions', user=user,
                                   sys_prefix=sys_prefix)
    if logger:
        logger.info("{} extension {}...".format(
            "Enabling" if state else "Disabling",
            name
        ))

    old_state = extensions.get(name, None)
    if old_state is None:
        old_state = dict(enabled=False)
    elif isinstance(old_state, bool):
        old_state = dict(enabled=old_state)
    old_enabled = old_state['enabled']
    new_enabled = state if state is not None else not old_enabled

    if logger:
        if new_enabled:
            logger.info(u"Enabling: %s" % (name))
        else:
            logger.info(u"Disabling: %s" % (name))

    extensions[name] = dict(
        enabled=new_enabled,
        python_module=python_module
    )

    _write_config_data('labextensions', extensions, user=user,
                       sys_prefix=sys_prefix, logger=logger)

    if new_enabled:
        full_dest = find_labextension(name)
        validate_labextension_folder(name, full_dest, logger=logger)

    return old_enabled == state


def _set_labextension_state_python(state, module, user, sys_prefix,
                                  logger=None):
    """Enable or disable some labextensions stored in a Python package

    Returns a list of whether the state was achieved (i.e. changed, or was
    already right)

    Parameters
    ----------

    state : Bool
        Whether the extensions should be enabled
    module : str
        Importable Python module exposing the
        magic-named `_jupyter_labextension_paths` function
    user : bool
        Whether to enable in the user's labextensions directory.
    sys_prefix : bool
        Enable/disable in the sys.prefix, i.e. environment
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    m, labexts = _get_labextension_metadata(module)
    return [_set_labextension_state(name=labext["name"],
                                   state=state,
                                   user=user, sys_prefix=sys_prefix,
                                   logger=logger,
                                   python_module=module)
            for labext in labexts]


def enable_labextension(name, user=True, sys_prefix=False,
                       logger=None):
    """Enable a named labextension

    Returns True if the final state is the one requested.

    Parameters
    ----------
    name : string
        The name of the extension.
    user : bool [default: True]
        Whether to enable in the user's labextensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_labextension_state(name=name,
                                  state=True,
                                  user=user, sys_prefix=sys_prefix,
                                  logger=logger)


def disable_labextension(name, user=True, sys_prefix=False,
                        logger=None):
    """Disable a named labextension
    
    Returns True if the final state is the one requested.

    Parameters
    ----------
    name : string
        The name of the extension.
    user : bool [default: True]
        Whether to enable in the user's labextensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`.
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_labextension_state(name=name,
                                  state=False,
                                  user=user, sys_prefix=sys_prefix,
                                  logger=logger)


def enable_labextension_python(module, user=True, sys_prefix=False,
                              logger=None):
    """Enable some labextensions associated with a Python module.

    Returns a list of whether the state was achieved (i.e. changed, or was
    already right)

    Parameters
    ----------

    module : str
        Importable Python module exposing the
        magic-named `_jupyter_labextension_paths` function
    user : bool [default: True]
        Whether to enable in the user's labextensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment. Will override
        `user`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_labextension_state_python(True, module, user, sys_prefix,
                                         logger=logger)


def disable_labextension_python(module, user=True, sys_prefix=False,
                               logger=None):
    """Disable some labextensions associated with a Python module.

    Returns True if the final state is the one requested.

    Parameters
    ----------
    module : str
        Importable Python module exposing the
        magic-named `_jupyter_labextension_paths` function
    user : bool [default: True]
        Whether to enable in the user's labextensions directory.
    sys_prefix : bool [default: False]
        Whether to enable in the sys.prefix, i.e. environment
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    return _set_labextension_state_python(False, module, user, sys_prefix,
                                         logger=logger)


def find_labextension(name):
    """Find a labextension path

    Looks across all of the labextension directories.

    Returns the first path where the extension is found,
    or None if not found.

    Parameters
    ----------
    name : str
        The name of the extension.
    """
    for exts in jupyter_path('labextensions'):
        full_dest = os.path.join(exts, name)
        if os.path.exists(full_dest):
            return full_dest
    return None


def validate_labextension_folder(name, full_dest, logger=None):
    """Assess the health of an installed labextension

    Returns a list of warnings.

    Parameters
    ----------
    full_dest : str
        The on-disk location of the installed labextension: this should end
        with `labextensions/<name>`
    logger : Jupyter logger [optional]
        Logger instance to use
    """
    infos = []
    warnings = []

    has_files = []
    has_entry = False
    version_compatible = []

    data = get_labextension_manifest_data_by_folder(full_dest)
    for manifest in data.values():
        if ('entry' in manifest and 'modules' in manifest):
            if (manifest['entry'] in manifest['modules']):
                has_entry = True
        files = manifest.get('files', [])
        if not files:
            has_files.append("No 'files' key in manifest")
        else:
            for fname in files:
                path = os.path.join(full_dest, fname)
                if not os.path.exists(path):
                    has_files.append("File in manifest does not exist: {}".format(path))

    indent = "        "
    subindent = indent + "    "
    entry_msg = indent + u"{} has entry point in manifest"
    name = os.path.basename(full_dest)
    if has_entry:
        infos.append(entry_msg.format(GREEN_OK))
    else:
        warnings.append(entry_msg.format(RED_X))

    files_msg = indent+u"{} has necessary files"
    if len(has_files)==0:
        infos.append(files_msg.format(GREEN_OK))
    else:
        warnings.append(files_msg.format(RED_X))
        for m in has_files:
            warnings.append(subindent+m)

    if len(version_compatible)==0:
        infos.append(indent+"{} is version compatible with installed JupyterLab version {}".format(GREEN_OK, __version__))
    else:
        warnings.append(indent+"{} is not version compatible with installed JupyterLab version {}".format(RED_X, __version__))
        for m in version_compatible:
            warnings.append(subindent+m)

    if logger and warnings:
            #[logger.info(info) for info in infos]
            [logger.warn(warning) for warning in warnings]

    return warnings


def get_labextension_manifest_data_by_folder(folder):
    """Get the manifest data for a given lab extension folder
    """
    manifest_files = glob.glob(os.path.join(folder, '*.manifest'))
    manifests = {}
    for file in manifest_files:
        with open(file) as fid:
            manifest = json.load(fid)
        manifests[manifest['name']] = manifest
    return manifests


def get_labextension_manifest_data_by_name(name):
    """Get the manifest data for a given lab extension folder
    """
    for exts in jupyter_path('labextensions'):
        full_dest = os.path.join(exts, name)
        if os.path.exists(full_dest):
            return get_labextension_manifest_data_by_folder(full_dest)


def get_labextension_config_python(module):
    """Get the labextension configuration data associated  with a Python module. 

    Parameters
    -----------
    module : str
    Importable Python module exposing the
    magic-named `_jupyter_labextension_config` function
    """
    m = import_item(module)
    if not hasattr(m, '_jupyter_labextension_config'):
        return {}
    return m._jupyter_labextension_config()


#----------------------------------------------------------------------
# Applications
#----------------------------------------------------------------------

from traitlets import Bool, Unicode
from jupyter_core.application import JupyterApp

_base_flags = {}
_base_flags.update(JupyterApp.flags)
_base_flags.pop("y", None)
_base_flags.pop("generate-config", None)
_base_flags.update({
    "user" : ({
        "BaseLabExtensionApp" : {
            "user" : True,
        }}, "Apply the operation only for the given user"
    ),
    "system" : ({
        "BaseLabExtensionApp" : {
            "user" : False,
            "sys_prefix": False,
        }}, "Apply the operation system-wide"
    ),
    "sys-prefix" : ({
        "BaseLabExtensionApp" : {
            "sys_prefix" : True,
        }}, "Use sys.prefix as the prefix for installing labextensions (for environments, packaging)"
    ),
    "py" : ({
        "BaseLabExtensionApp" : {
            "python" : True,
        }}, "Install from a Python package"
    )
})
_base_flags['python'] = _base_flags['py']

class BaseLabExtensionApp(JupyterApp):
    """Base labextension installer app"""
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
        "InstallLabExtensionApp" : {
            "overwrite" : True,
        }}, "Force overwrite of existing files"
    ),
    "symlink" : ({
        "InstallLabExtensionApp" : {
            "symlink" : True,
        }}, "Create symlink instead of copying files"
    ),
})

flags['s'] = flags['symlink']

aliases = {
    "prefix" : "InstallLabExtensionApp.prefix",
    "labextensions" : "InstallLabExtensionApp.labextensions_dir",
}


class InstallLabExtensionApp(BaseLabExtensionApp):
    """Entry point for installing JupyterLab extensions"""
    description = """Install JupyterLab extensions
    
    Usage
    
        jupyter labextension install /path/to/myextension myextension [--user|--sys-prefix]
        jupyter labextension install --py myextensionPyPackage [--user|--sys-prefix]
    
    This copies a file or a folder into the Jupyter labextensions directory.
    If a URL is given, it will be downloaded.
    If an archive is given, it will be extracted into labextensions.
    If the requested files are already up to date, no action is taken
    unless --overwrite is specified.
    """
    
    examples = """
    jupyter labextension install /path/to/myextension myextension
    jupyter labextension install --py myextensionPyPackage
    """
    aliases = aliases
    flags = flags
    
    overwrite = Bool(False, config=True, help="Force overwrite of existing files")
    symlink = Bool(False, config=True, help="Create symlinks instead of copying files")

    prefix = Unicode('', config=True, help="Installation prefix")
    labextensions_dir = Unicode('', config=True,
           help="Full path to labextensions dir (probably use prefix or user)")

    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyterlab_config'
    
    def install_extensions(self):
        """Perform the installation of labextension(s)"""
        if self.python:
            if len(self.extra_args) > 1:
                raise ValueError("Only one labextension allowed at a time. "
                         "Call multiple times to install multiple extensions.")
            install = install_labextension_python
            kwargs = {}
        else:
            if len(self.extra_args) > 2:
                raise ValueError("Only one labextension allowed at a time. "
                         "Call multiple times to install multiple extensions.")
            install = install_labextension
            kwargs = {'name': self.extra_args[1]}
        
        full_dests = install(self.extra_args[0],
                             overwrite=self.overwrite,
                             symlink=self.symlink,
                             user=self.user,
                             sys_prefix=self.sys_prefix,
                             prefix=self.prefix,
                             labextensions_dir=self.labextensions_dir,
                             logger=self.log,
                             **kwargs
                            )

        if full_dests:
            self.log.info(
                u"\nTo enable this labextension in the browser every time"
                " JupyterLab loads:\n\n"
                "      jupyter labextension enable {}{}{}{}\n".format(
                    self.extra_args[0] if self.python else self.extra_args[1],
                    " --user" if self.user else "",
                    " --py" if self.python else "",
                    " --sys-prefix" if self.sys_prefix else ""
                )
            )

    def start(self):
        """Perform the App's function as configured"""
        if not self.extra_args:
            sys.exit('Please specify a labextension to install')
        else:
            try:
                self.install_extensions()
            except ArgumentConflict as e:
                sys.exit(str(e))


class UninstallLabExtensionApp(BaseLabExtensionApp):
    """Entry point for uninstalling JupyterLab extensions"""
    version = __version__
    description = """Uninstall Jupyterlab extensions
    
    Usage
    
        jupyter labextension uninstall myextension
        jupyter labextension uninstall --py myextensionPyPackage
    
    This uninstalls a labextension.
    """
    
    examples = """
    jupyter labextension uninstall myextension
    jupyter labextension uninstall --py myextensionPyPackage
    """
    
    aliases = {
        "prefix" : "UninstallLabExtensionApp.prefix",
        "labextensions" : "UninstallLabExtensionApp.labextensions_dir",
        "name": "UninstallLabExtensionApp.name",
    }
    
    prefix = Unicode('', config=True, help="Installation prefix")
    labextensions_dir = Unicode('', config=True, help="Full path to labextensions dir (probably use prefix or user)")
    name = Unicode('', config=True, help="The name of the extension.")
    
    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyterlab_config'
    
    def uninstall_extensions(self):
        """Uninstall some labextensions"""
        kwargs = {
            'user': self.user,
            'sys_prefix': self.sys_prefix,
            'prefix': self.prefix,
            'labextensions_dir': self.labextensions_dir,
            'logger': self.log
        }
        
        arg_count = 1
        if len(self.extra_args) > arg_count:
            raise ValueError("only one labextension allowed at a time.  Call multiple times to uninstall multiple extensions.")
        if len(self.extra_args) < arg_count:
            raise ValueError("not enough arguments")
        
        if self.python:
            uninstall_labextension_python(self.extra_args[0], **kwargs)
        else:
            uninstall_labextension(self.extra_args[0], **kwargs)
    
    def start(self):
        if not self.extra_args:
            sys.exit('Please specify a labextension to uninstall')
        else:
            try:
                self.uninstall_extensions()
            except ArgumentConflict as e:
                sys.exit(str(e))


class ToggleLabExtensionApp(BaseLabExtensionApp):
    """A base class for apps that enable/disable extensions"""
    name = "jupyter labextension enable/disable"
    version = __version__
    description = "Enable/disable a labextension in configuration."

    user = Bool(True, config=True, help="Apply the configuration only for the current user (default)")
    
    _toggle_value = None

    def _config_file_name_default(self):
        """The default config file name."""
        return 'jupyterlab_config'
    
    def toggle_labextension_python(self, module):
        """Toggle some extensions in an importable Python module.

        Returns a list of booleans indicating whether the state was changed as
        requested.

        Parameters
        ----------
        module : str
            Importable Python module exposing the
            magic-named `_jupyter_labextension_paths` function
        """
        toggle = (enable_labextension_python if self._toggle_value
                  else disable_labextension_python)
        return toggle(module,
                      user=self.user,
                      sys_prefix=self.sys_prefix,
                      logger=self.log)

    def toggle_labextension(self, name):
        """Toggle some a named labextension by require-able AMD module.

        Returns whether the state was changed as requested.

        Parameters
        ----------
        require : str
            require.js path used to load the labextension
        """
        toggle = (enable_labextension if self._toggle_value
                  else disable_labextension)
        return toggle(name,
                      user=self.user, sys_prefix=self.sys_prefix,
                      logger=self.log)
        
    def start(self):
        if not self.extra_args:
            sys.exit('Please specify a labextension/package to enable or disable')
        elif len(self.extra_args) > 1:
            sys.exit('Please specify one labextension/package at a time')
        if self.python:
            self.toggle_labextension_python(self.extra_args[0])
        else:
            self.toggle_labextension(self.extra_args[0])


class EnableLabExtensionApp(ToggleLabExtensionApp):
    """An App that enables labextensions"""
    name = "jupyter labextension enable"
    description = """
    Enable a labextension in frontend configuration.
    
    Usage
        jupyter labextension enable myextension [--system|--sys-prefix]
    """
    _toggle_value = True


class DisableLabExtensionApp(ToggleLabExtensionApp):
    """An App that disables labextensions"""
    name = "jupyter labextension disable"
    description = """
    Enable a labextension in frontend configuration.
    
    Usage
        jupyter labextension disable myextension [--system|--sys-prefix]
    """
    _toggle_value = None


class ListLabExtensionsApp(BaseLabExtensionApp):
    """An App that lists and validates labextensions"""
    name = "jupyter labextension list"
    version = __version__
    description = "List all labextensions known by the configuration system"
    
    def list_labextensions(self):
        """List all the labextensions"""
        print("Known labextensions:")
        seen = False
        for config_dir in jupyter_config_path():
            config_dir = os.path.join(config_dir, CONFIG_DIR)
            cm = BaseJSONConfigManager(parent=self, config_dir=config_dir)
            labextensions = cm.get('labextensions')
            if labextensions:
                print(u'config dir: {}'.format(config_dir))
                seen = True
            for name, config in sorted(labextensions.items()):
                if isinstance(config, bool):
                    config = dict(enabled=config)
                enabled = config['enabled']
                full_dest = find_labextension(name)
                print(u'    {} {}: {}'.format(
                              name,
                              GREEN_ENABLED if enabled else RED_DISABLED,
                              full_dest if not None else RED_X+" Files not found"
                              ))
                if full_dest is not None:
                    validate_labextension_folder(name, full_dest, self.log)
        if not seen:
            print('....None found!')

    def start(self):
        """Perform the App's functions as configured"""
        self.list_labextensions()


_examples = """
jupyter labextension list                          # list all configured labextensions
jupyter labextension install --py <packagename>    # install a labextension from a Python package
jupyter labextension enable --py <packagename>     # enable all labextensions in a Python package
jupyter labextension disable --py <packagename>    # disable all labextensions in a Python package
jupyter labextension uninstall --py <packagename>  # uninstall a labextension in a Python package
"""

class LabExtensionApp(BaseLabExtensionApp):
    """Base jupyter labextension command entry point"""
    name = "jupyter labextension"
    version = __version__
    description = "Work with JupyterLab extensions"
    examples = _examples

    subcommands = dict(
        install=(InstallLabExtensionApp, "Install a labextension"),
        enable=(EnableLabExtensionApp, "Enable a labextension"),
        disable=(DisableLabExtensionApp, "Disable a labextension"),
        uninstall=(UninstallLabExtensionApp, "Uninstall a labextension"),
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


def _get_labextension_dir(user=False, sys_prefix=False, prefix=None, labextensions_dir=None):
    """Return the labextension directory specified

    Parameters
    ----------

    user : bool [default: False]
        Get the user's .jupyter/labextensions directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/share/jupyter/labextensions
    prefix : str [optional]
        Get custom prefix
    labextensions_dir : str [optional]
        Get what you put in
    """
    if sum(map(bool, [user, prefix, labextensions_dir, sys_prefix])) > 1:
        raise ArgumentConflict("cannot specify more than one of user, sys_prefix, prefix, or labextensions_dir")
    if user:
        labext = pjoin(jupyter_data_dir(), u'labextensions')
    elif sys_prefix:
        labext = pjoin(ENV_JUPYTER_PATH[0], u'labextensions')
    elif prefix:
        labext = pjoin(prefix, 'share', 'jupyter', 'labextensions')
    elif labextensions_dir:
        labext = labextensions_dir
    else:
        labext = pjoin(SYSTEM_JUPYTER_PATH[0], 'labextensions')
    return labext


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
        labext = jupyter_config_dir()
    elif sys_prefix:
        labext = ENV_CONFIG_PATH[0]
    else:
        labext = SYSTEM_CONFIG_PATH[0]
    return os.path.join(labext, CONFIG_DIR)


def _get_labextension_metadata(module):
    """Get the list of labextension paths associated with a Python module.

    Returns a tuple of (the module,             [{
        'name': 'mockextension',
        'src': 'static',
    }])

    Parameters
    ----------

    module : str
        Importable Python module exposing the
        magic-named `_jupyter_labextension_paths` function
    """
    m = import_item(module)
    if not hasattr(m, '_jupyter_labextension_paths'):
        raise KeyError('The Python module {} is not a valid labextension'.format(module))
    labexts = m._jupyter_labextension_paths()
    return m, labexts


def _read_config_data(section, user=False, sys_prefix=False):
    """Get the config for the current context

    Returns the string to the enviornment

    Parameters
    ----------
    section: string
        The section of config to read.
    user : bool [default: False]
        Get the user's .jupyter config directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/etc/jupyter
    """
    config_dir = _get_config_dir(user=user, sys_prefix=sys_prefix)
    return BaseJSONConfigManager(config_dir=config_dir).get(section)


def _write_config_data(section, data, user=False, sys_prefix=False, logger=None):
    """Update the config for the current context

    Parameters
    ----------
    section: string
        The section of data to update.
    data : object
        An object which can be accepted by ConfigManager.update
    user : bool [default: False]
        Get the user's .jupyter config directory
    sys_prefix : bool [default: False]
        Get sys.prefix, i.e. ~/.envs/my-env/etc/jupyter
    logger: logger instance
        The logger instance.
    """
    config_dir = _get_config_dir(user=user, sys_prefix=sys_prefix)
    if logger:
        logger.info(u"- Writing config: {}".format(config_dir))
    config_man = BaseJSONConfigManager(config_dir=config_dir)
    config_man.update(section, data)


if __name__ == '__main__':
    main()
