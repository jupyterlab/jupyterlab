# coding: utf-8
"""A tornado based Jupyter notebook server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import absolute_import, print_function

import notebook
import gettext
import io
import json
import mimetypes
import os
import random
import re
import select
import sys
import time

from notebook.transutils import trans, _

# check for tornado 3.1.0
from notebook import (
    DEFAULT_STATIC_FILES_PATH,
    DEFAULT_TEMPLATE_PATH_LIST,
    __version__,
)

from jinja2 import Environment, FileSystemLoader


from jupyter_server.services.kernels.kernelmanager import MappingKernelManager
from jupyter_server.services.contents.manager import ContentsManager
from jupyter_server.services.contents.filemanager import FileContentsManager

from traitlets.config.application import boolean_flag
from jupyter_core.application import (
    base_flags, base_aliases,
)

from jupyter_server.base.handlers import FileFindHandler

from jupyter_client import KernelManager
from traitlets import (
    Any, Dict, Unicode, Integer, List, Bool, Bytes, Instance,
    TraitError, Type, Float, observe, default, validate
)
from ipython_genutils import py3compat
from jupyter_core.paths import jupyter_runtime_dir, jupyter_path

from jupyter_server.utils import url_path_join

# Try to load Notebook as an extension of the Jupyter Server
from jupyter_server.extension.application import ExtensionApp
    
#-----------------------------------------------------------------------------
# Module globals
#-----------------------------------------------------------------------------

_examples = """
jupyter notebook                       # start the notebook
jupyter notebook --certfile=mycert.pem # use SSL/TLS certificate
jupyter notebook password              # enter a password to protect the server
"""

#-----------------------------------------------------------------------------
# Helper functions
#-----------------------------------------------------------------------------

def random_ports(port, n):
    """Generate a list of n random ports near the given port.

    The first 5 ports will be sequential, and the remaining n-5 will be
    randomly selected in the range [port-2*n, port+2*n].
    """
    for i in range(min(5, n)):
        yield port + i
    for i in range(n-5):
        yield max(1, port + random.randint(-2*n, 2*n))

def load_handlers(name):
    """Load the (URL pattern, handler) tuples for each component."""
    mod = __import__(name, fromlist=['default_handlers'])
    return mod.default_handlers

#-----------------------------------------------------------------------------
# Aliases and Flags
#-----------------------------------------------------------------------------

flags = dict(base_flags)
flags['no-browser']=(
    {'NotebookApp' : {'open_browser' : False}},
    _("Don't open the notebook in a browser after startup.")
)
flags['pylab']=(
    {'NotebookApp' : {'pylab' : 'warn'}},
    _("DISABLED: use %pylab or %matplotlib in the notebook to enable matplotlib.")
)
flags['no-mathjax']=(
    {'NotebookApp' : {'enable_mathjax' : False}},
    """Disable MathJax
    
    MathJax is the javascript library Jupyter uses to render math/LaTeX. It is
    very large, so you may want to disable it if you have a slow internet
    connection, or for offline use of the notebook.
    
    When disabled, equations etc. will appear as their untransformed TeX source.
    """
)

flags['allow-root']=(
    {'NotebookApp' : {'allow_root' : True}},
    _("Allow the notebook to be run from root user.")
)

# Add notebook manager flags
flags.update(boolean_flag('script', 'FileContentsManager.save_script',
               'DEPRECATED, IGNORED',
               'DEPRECATED, IGNORED'))

aliases = dict(base_aliases)

aliases.update({
    'ip': 'NotebookApp.ip',
    'port': 'NotebookApp.port',
    'port-retries': 'NotebookApp.port_retries',
    'transport': 'KernelManager.transport',
    'keyfile': 'NotebookApp.keyfile',
    'certfile': 'NotebookApp.certfile',
    'client-ca': 'NotebookApp.client_ca',
    'notebook-dir': 'NotebookApp.notebook_dir',
    'browser': 'NotebookApp.browser',
    'pylab': 'NotebookApp.pylab',
    'gateway-url': 'GatewayClient.url',
})

#-----------------------------------------------------------------------------
# NotebookApp
#-----------------------------------------------------------------------------

class NotebookApp(ExtensionApp):
    
    name = 'jupyter-notebook'
    extension_name = 'notebook'

    version = __version__
    description = _("""The Jupyter HTML Notebook.
    
    This launches a Tornado based HTML Notebook Server that serves up an HTML5/Javascript Notebook client.""")

    ignore_minified_js = Bool(False,
            config=True,
            help=_('Deprecated: Use minified JS file or not, mainly use during dev to avoid JS recompilation'), 
            )

    max_body_size = Integer(512 * 1024 * 1024, config=True,
        help="""
        Sets the maximum allowed size of the client request body, specified in 
        the Content-Length request header field. If the size in a request 
        exceeds the configured value, a malformed HTTP message is returned to
        the client.

        Note: max_body_size is applied even in streaming mode.
        """
    )

    max_buffer_size = Integer(512 * 1024 * 1024, config=True,
        help="""
        Gets or sets the maximum amount of memory, in bytes, that is allocated 
        for use by the buffer manager.
        """
    )

    jinja_environment_options = Dict(config=True, 
        help=_("Supply extra arguments that will be passed to Jinja environment.")
    )

    jinja_template_vars = Dict(
        config=True,
        help=_("Extra variables to supply to jinja templates when rendering."),
    )

    enable_mathjax = Bool(True, config=True,
        help="""Whether to enable MathJax for typesetting math/TeX

        MathJax is the javascript library Jupyter uses to render math/LaTeX. It is
        very large, so you may want to disable it if you have a slow internet
        connection, or for offline use of the notebook.

        When disabled, equations etc. will appear as their untransformed TeX source.
        """
    )

    @observe('enable_mathjax')
    def _update_enable_mathjax(self, change):
        """set mathjax url to empty if mathjax is disabled"""
        if not change['new']:
            self.mathjax_url = u''

    extra_static_paths = List(Unicode(), config=True,
        help="""Extra paths to search for serving static files.
        
        This allows adding javascript/css to be available from the notebook server machine,
        or overriding individual files in the IPython"""
    )
    
    @property
    def static_file_path(self):
        """return extra paths + the default location"""
        return self.extra_static_paths + [DEFAULT_STATIC_FILES_PATH]
    
    static_custom_path = List(Unicode(),
        help=_("""Path to search for custom.js, css""")
    )

    @default('static_custom_path')
    def _default_static_custom_path(self):
        return [
            os.path.join(d, 'custom') for d in (
                self.config_dir,
                DEFAULT_STATIC_FILES_PATH)
        ]

    extra_template_paths = List(Unicode(), config=True,
        help=_("""Extra paths to search for serving jinja templates.

        Can be used to override templates from notebook.templates.""")
    )

    @property
    def template_file_path(self):
        """return extra paths + the default locations"""
        return self.extra_template_paths + DEFAULT_TEMPLATE_PATH_LIST

    extra_nbextensions_path = List(Unicode(), config=True,
        help=_("""extra paths to look for Javascript notebook extensions""")
    )

    extra_services = List(Unicode(), config=True,
        help=_("""handlers that should be loaded at higher priority than the default services""")
    )
    
    @property
    def nbextensions_path(self):
        """The path to look for Javascript notebook extensions"""
        path = self.extra_nbextensions_path + jupyter_path('nbextensions')
        # FIXME: remove IPython nbextensions path after a migration period
        try:
            from IPython.paths import get_ipython_dir
        except ImportError:
            pass
        else:
            path.append(os.path.join(get_ipython_dir(), 'nbextensions'))
        return path

    mathjax_url = Unicode("", config=True,
        help="""A custom url for MathJax.js.
        Should be in the form of a case-sensitive url to MathJax,
        for example:  /static/components/MathJax/MathJax.js
        """
    )

    @property
    def static_url_prefix(self):
        """Get the static url prefix for serving static files."""
        return super(NotebookApp, self).static_url_prefix
        try:
            return super(NotebookApp, self).static_url_prefix
        except AttributeError:
            return self.tornado_settings.get("static_url_prefix", "static")

    @default('mathjax_url')
    def _default_mathjax_url(self):
        if not self.enable_mathjax:
            return u''
        static_url_prefix = self.static_url_prefix
        return url_path_join(static_url_prefix, 'components', 'MathJax', 'MathJax.js')
    
    @observe('mathjax_url')
    def _update_mathjax_url(self, change):
        new = change['new']
        if new and not self.enable_mathjax:
            # enable_mathjax=False overrides mathjax_url
            self.mathjax_url = u''
        else:
            self.log.info(_("Using MathJax: %s"), new)

    mathjax_config = Unicode("TeX-AMS-MML_HTMLorMML-full,Safe", config=True,
        help=_("""The MathJax.js configuration file that is to be used.""")
    )

    @observe('mathjax_config')
    def _update_mathjax_config(self, change):
        self.log.info(_("Using MathJax configuration file: %s"), change['new'])

    @default('info_file')
    def _default_info_file(self):
        info_file = "nbserver-%s.json" % os.getpid()
        return os.path.join(self.runtime_dir, info_file)

    browser_open_file = Unicode()

    @default('browser_open_file')
    def _default_browser_open_file(self):
        basename = "nbserver-%s-open.html" % os.getpid()
        return os.path.join(self.runtime_dir, basename)

    # notebook_dir = Unicode(config=True,
    #     help=_("The directory to use for notebooks and kernels.")
    # )

    # @default('notebook_dir')
    # def _default_notebook_dir(self):
    #     if self.file_to_run:
    #         return os.path.dirname(os.path.abspath(self.file_to_run))
    #     else:
    #         return py3compat.getcwd()

    # @validate('notebook_dir')
    # def _notebook_dir_validate(self, proposal):
    #     value = proposal['value']
    #     # Strip any trailing slashes
    #     # *except* if it's root
    #     _, path = os.path.splitdrive(value)
    #     if path == os.sep:
    #         return value
    #     value = value.rstrip(os.sep)
    #     if not os.path.isabs(value):
    #         # If we receive a non-absolute path, make it absolute.
    #         value = os.path.abspath(value)
    #     if not os.path.isdir(value):
    #         raise TraitError(trans.gettext("No such notebook dir: '%r'") % value)
    #     return value

    # @observe('notebook_dir')
    # def _update_notebook_dir(self, change):
    #     """Do a bit of validation of the notebook dir."""
    #     # setting App.notebook_dir implies setting notebook and kernel dirs as well
    #     new = change['new']
    #     self.config.FileContentsManager.root_dir = new
    #     self.config.MappingKernelManager.root_dir = new

    nbserver_extensions = Dict({}, config=True,
        help=(_("Dict of Python modules to load as notebook server extensions."
              "Entry values can be used to enable and disable the loading of"
              "the extensions. The extensions will be loaded in alphabetical "
              "order."))
    )

    # ------------------------------------------------------------------------
    # traits and methods for Jupyter Server
    # ------------------------------------------------------------------------

    default_url = Unicode("/tree", config=True)

    @property
    def static_paths(self):
        """Rename trait in jupyter_server."""
        return self.static_file_path

    @property
    def template_paths(self):
        """Rename trait for Jupyter Server."""
        return self.template_file_path

    def initialize_templates(self):
        """Initialize the jinja templates for the notebook application."""
        _template_path = self.template_paths
        if isinstance(_template_path, py3compat.string_types):
            _template_path = (_template_path,)
        template_path = [os.path.expanduser(path) for path in _template_path]

        jenv_opt = {"autoescape": True}
        jenv_opt.update(self.jinja_environment_options if self.jinja_environment_options else {})

        env = Environment(loader=FileSystemLoader(template_path), extensions=['jinja2.ext.i18n'], **jenv_opt)

        # If the user is running the notebook in a git directory, make the assumption
        # that this is a dev install and suggest to the developer `npm run build:watch`.
        base_dir = os.path.realpath(os.path.join(__file__, '..', '..'))
        dev_mode = os.path.exists(os.path.join(base_dir, '.git'))

        nbui = gettext.translation('nbui', localedir=os.path.join(base_dir, 'notebook/i18n'), fallback=True)
        env.install_gettext_translations(nbui, newstyle=False)

        if dev_mode:
            DEV_NOTE_NPM = """It looks like you're running the notebook from source.
    If you're working on the Javascript of the notebook, try running
    %s
    in another terminal window to have the system incrementally
    watch and build the notebook's JavaScript for you, as you make changes.""" % 'npm run build:watch'
            self.log.info(DEV_NOTE_NPM)

        template_settings = dict(
            notebook_template_paths=template_path,
            notebook_jinja_template_vars=self.jinja_template_vars,
            notebook_jinja2_env=env,
        )
        self.settings.update(**template_settings)


    def initialize_settings(self):
        """Add settings to the tornado app."""
        if self.ignore_minified_js:
            log.warning(_("""The `ignore_minified_js` flag is deprecated and no longer works."""))
            log.warning(_("""Alternatively use `%s` when working on the notebook's Javascript and LESS""") % 'npm run build:watch')
            warnings.warn(_("The `ignore_minified_js` flag is deprecated and will be removed in Notebook 6.0"), DeprecationWarning)

        settings = dict(
            ignore_minified_js=self.ignore_minified_js,
            mathjax_url=self.mathjax_url,
            mathjax_config=self.mathjax_config,
            nbextensions_path=self.nbextensions_path,
        )
        self.settings.update(**settings)

    def initialize_handlers(self):
        """Load the (URL pattern, handler) tuples for each component."""
        # Order matters. The first handler to match the URL will handle the request.
        handlers = []
        # load extra services specified by users before default handlers
        for service in self.settings['extra_services']:
            handlers.extend(load_handlers(service))
        handlers.extend(load_handlers('notebook.tree.handlers'))
        handlers.extend(load_handlers('notebook.notebook.handlers'))

        handlers.append(
            (r"/nbextensions/(.*)", FileFindHandler, {
                'path': self.settings['nbextensions_path'],
                'no_cache_paths': ['/'], # don't cache anything in nbextensions
            }),
        )
        handlers.append(
            (r"/custom/(.*)", FileFindHandler, {
                'path': self.settings['static_custom_path'],
                'no_cache_paths': ['/'], # don't cache anything in custom
            })
        )
        
        # Add new handlers to Jupyter server handlers.
        self.handlers.extend(handlers)


#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = NotebookApp.launch_instance
