# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import os.path as osp
from os.path import join as pjoin
import sys
from jinja2 import Environment, FileSystemLoader

from jupyter_core.application import JupyterApp, base_aliases, base_flags
from jupyter_core.application import NoStart
from jupyterlab_server import slugify, WORKSPACE_EXTENSION
from jupyter_server.serverapp import aliases, flags
from jupyter_server.utils import url_path_join as ujoin
from jupyter_server._version import version_info as jpserver_version_info
from traitlets import Bool, Instance, Unicode, default

from nbclassic.shim import NBClassicConfigShimMixin
from jupyterlab_server import LabServerApp

from ._version import __version__
from .debuglog import DebugLogFileMixin
from .commands import (
    DEV_DIR, HERE,
    build, clean, get_app_dir, get_app_version, get_user_settings_dir,
    get_workspaces_dir, AppOptions, pjoin, get_app_info,
    ensure_core, ensure_dev, watch, watch_dev, ensure_app
)
from .coreconfig import CoreConfig
from .handlers.build_handler import build_path, Builder, BuildHandler
from .handlers.extension_manager_handler import (
    extensions_handler_path, ExtensionManager, ExtensionHandler
)
from .handlers.error_handler import ErrorHandler


DEV_NOTE = """You're running JupyterLab from source.
If you're working on the TypeScript sources of JupyterLab, try running

    jupyter lab --dev-mode --watch


to have the system incrementally watch and build JupyterLab for you, as you
make changes.
"""


CORE_NOTE = """
Running the core application with no additional extensions or settings
"""

build_aliases = dict(base_aliases)
build_aliases['app-dir'] = 'LabBuildApp.app_dir'
build_aliases['name'] = 'LabBuildApp.name'
build_aliases['version'] = 'LabBuildApp.version'
build_aliases['dev-build'] = 'LabBuildApp.dev_build'
build_aliases['minimize'] = 'LabBuildApp.minimize'
build_aliases['debug-log-path'] = 'DebugLogFileMixin.debug_log_path'

build_flags = dict(flags)

version = __version__
app_version = get_app_version()
if version != app_version:
    version = '%s (dev), %s (app)' % (__version__, app_version)

buildFailureMsg = """Build failed.
Troubleshooting: If the build failed due to an out-of-memory error, you
may be able to fix it by disabling the `dev_build` and/or `minimize` options.

If you are building via the `jupyter lab build` command, you can disable
these options like so:

jupyter lab build --dev-build=False --minimize=False

You can also disable these options for all JupyterLab builds by adding these
lines to a Jupyter config file named `jupyter_config.py`:

c.LabBuildApp.minimize = False
c.LabBuildApp.dev_build = False

If you don't already have a `jupyter_config.py` file, you can create one by
adding a blank file of that name to any of the Jupyter config directories.
The config directories can be listed by running:

jupyter --paths

Explanation:

- `dev-build`: This option controls whether a `dev` or a more streamlined
`production` build is used. This option will default to `False` (ie the
`production` build) for most users. However, if you have any labextensions
installed from local files, this option will instead default to `True`.
Explicitly setting `dev-build` to `False` will ensure that the `production`
build is used in all circumstances.

- `minimize`: This option controls whether your JS bundle is minified
during the Webpack build, which helps to improve JupyterLab's overall
performance. However, the minifier plugin used by Webpack is very memory
intensive, so turning it off may help the build finish successfully in
low-memory environments.
"""

class LabBuildApp(JupyterApp, DebugLogFileMixin):
    version = version
    description = """
    Build the JupyterLab application

    The application is built in the JupyterLab app directory in `/staging`.
    When the build is complete it is put in the JupyterLab app `/static`
    directory, where it is used to serve the application.
    """
    aliases = build_aliases
    flags = build_flags

    # Not configurable!
    core_config = Instance(CoreConfig, allow_none=True)

    app_dir = Unicode('', config=True,
        help="The app directory to build in")

    name = Unicode('JupyterLab', config=True,
        help="The name of the built application")

    version = Unicode('', config=True,
        help="The version of the built application")

    dev_build = Bool(None, allow_none=True, config=True,
        help="Whether to build in dev mode. Defaults to True (dev mode) if there are any locally linked extensions, else defaults to False (prod mode).")

    minimize = Bool(True, config=True,
        help="Whether to use a minifier during the Webpack build (defaults to True). Only affects production builds.")

    pre_clean = Bool(False, config=True,
        help="Whether to clean before building (defaults to False)")

    def start(self):
        parts = ['build']
        parts.append('none' if self.dev_build is None else
                     'dev' if self.dev_build else
                     'prod')
        if self.minimize:
            parts.append('minimize')
        command = ':'.join(parts)

        app_dir = self.app_dir or get_app_dir()
        app_options = AppOptions(
            app_dir=app_dir, logger=self.log, core_config=self.core_config
        )
        self.log.info('JupyterLab %s', version)
        with self.debug_logging():
            if self.pre_clean:
                self.log.info('Cleaning %s' % app_dir)
                clean(app_options=app_options)
            self.log.info('Building in %s', app_dir)
            try:
                build(name=self.name, version=self.version,
                  command=command, app_options=app_options)
            except Exception as e:
                print(buildFailureMsg)
                raise e


clean_aliases = dict(base_aliases)
clean_aliases['app-dir'] = 'LabCleanApp.app_dir'

ext_warn_msg = "WARNING: this will delete all of your extensions, which will need to be reinstalled"

clean_flags = dict(base_flags)
clean_flags['extensions'] = ({'LabCleanApp': {'extensions': True}},
    'Also delete <app-dir>/extensions.\n%s' % ext_warn_msg)
clean_flags['settings'] = ({'LabCleanApp': {'settings': True}}, 'Also delete <app-dir>/settings')
clean_flags['static'] = ({'LabCleanApp': {'static': True}}, 'Also delete <app-dir>/static')
clean_flags['all'] = ({'LabCleanApp': {'all': True}},
    'Delete the entire contents of the app directory.\n%s' % ext_warn_msg)


class LabCleanAppOptions(AppOptions):
    extensions = Bool(False)
    settings = Bool(False)
    staging = Bool(True)
    static = Bool(False)
    all = Bool(False)


class LabCleanApp(JupyterApp):
    version = version
    description = """
    Clean the JupyterLab application

    This will clean the app directory by removing the `staging` directories.
    Optionally, the `extensions`, `settings`, and/or `static` directories,
    or the entire contents of the app directory, can also be removed.
    """
    aliases = clean_aliases
    flags = clean_flags

    # Not configurable!
    core_config = Instance(CoreConfig, allow_none=True)

    app_dir = Unicode('', config=True, help='The app directory to clean')

    extensions = Bool(False, config=True,
        help="Also delete <app-dir>/extensions.\n%s" % ext_warn_msg)

    settings = Bool(False, config=True, help="Also delete <app-dir>/settings")

    static = Bool(False, config=True, help="Also delete <app-dir>/static")

    all = Bool(False, config=True,
        help="Delete the entire contents of the app directory.\n%s" % ext_warn_msg)

    def start(self):
        app_options = LabCleanAppOptions(
            logger=self.log,
            core_config=self.core_config,
            app_dir=self.app_dir,
            extensions=self.extensions,
            settings=self.settings,
            static=self.static,
            all=self.all
        )
        clean(app_options=app_options)


class LabPathApp(JupyterApp):
    version = version
    description = """
    Print the configured paths for the JupyterLab application

    The application path can be configured using the JUPYTERLAB_DIR
        environment variable.
    The user settings path can be configured using the JUPYTERLAB_SETTINGS_DIR
        environment variable or it will fall back to
        `/lab/user-settings` in the default Jupyter configuration directory.
    The workspaces path can be configured using the JUPYTERLAB_WORKSPACES_DIR
        environment variable or it will fall back to
        '/lab/workspaces' in the default Jupyter configuration directory.
    """
    def start(self):
        print('Application directory:   %s' % get_app_dir())
        print('User Settings directory: %s' % get_user_settings_dir())
        print('Workspaces directory: %s' % get_workspaces_dir())


class LabWorkspaceExportApp(JupyterApp):
    version = version
    description = """
    Export a JupyterLab workspace

    If no arguments are passed in, this command will export the default
        workspace.
    If a workspace name is passed in, this command will export that workspace.
    If no workspace is found, this command will export an empty workspace.
    """
    def start(self):
        app = LabApp(config=self.config)
        base_url = app.settings.get('base_url', '/')
        directory = app.workspaces_dir
        app_url = app.app_url

        if len(self.extra_args) > 1:
            print('Too many arguments were provided for workspace export.')
            self.exit(1)

        workspaces_url = ujoin(app_url, 'workspaces')
        raw = (app_url if not self.extra_args
               else ujoin(workspaces_url, self.extra_args[0]))
        slug = slugify(raw, base_url)
        workspace_path = pjoin(directory, slug + WORKSPACE_EXTENSION)

        if osp.exists(workspace_path):
            with open(workspace_path) as fid:
                try:  # to load the workspace file.
                    print(fid.read())
                except Exception as e:
                    print(json.dumps(dict(data=dict(), metadata=dict(id=raw))))
        else:
            print(json.dumps(dict(data=dict(), metadata=dict(id=raw))))


class LabWorkspaceImportApp(JupyterApp):
    version = version
    description = """
    Import a JupyterLab workspace

    This command will import a workspace from a JSON file. The format of the
        file must be the same as what the export functionality emits.
    """
    workspace_name = Unicode(
        None,
        config=True,
        allow_none=True,
        help="""
        Workspace name. If given, the workspace ID in the imported
        file will be replaced with a new ID pointing to this
        workspace name.
        """
    )

    aliases = {
        'name': 'LabWorkspaceImportApp.workspace_name'
    }

    def start(self):
        app = LabApp(config=self.config)
        base_url = app.settings.get('base_url', '/')
        directory = app.workspaces_dir
        app_url = app.app_url
        workspaces_url = ujoin(app.app_url, 'workspaces')

        if len(self.extra_args) != 1:
            print('One argument is required for workspace import.')
            self.exit(1)

        workspace = dict()
        with self._smart_open() as fid:
            try:  # to load, parse, and validate the workspace file.
                workspace = self._validate(fid, base_url, app_url, workspaces_url)
            except Exception as e:
                print('%s is not a valid workspace:\n%s' % (fid.name, e))
                self.exit(1)

        if not osp.exists(directory):
            try:
                os.makedirs(directory)
            except Exception as e:
                print('Workspaces directory could not be created:\n%s' % e)
                self.exit(1)

        slug = slugify(workspace['metadata']['id'], base_url)
        workspace_path = pjoin(directory, slug + WORKSPACE_EXTENSION)

        # Write the workspace data to a file.
        with open(workspace_path, 'w') as fid:
            fid.write(json.dumps(workspace))

        print('Saved workspace: %s' % workspace_path)

    def _smart_open(self):
        file_name = self.extra_args[0]

        if file_name == '-':
            return sys.stdin
        else:
            file_path = osp.abspath(file_name)

            if not osp.exists(file_path):
                print('%s does not exist.' % file_name)
                self.exit(1)

            return open(file_path)

    def _validate(self, data, base_url, app_url, workspaces_url):
        workspace = json.load(data)

        if 'data' not in workspace:
            raise Exception('The `data` field is missing.')

        # If workspace_name is set in config, inject the
        # name into the workspace metadata.
        if self.workspace_name is not None:
            if self.workspace_name == "":
                workspace_id = ujoin(base_url, app_url)
            else:
                workspace_id = ujoin(base_url, workspaces_url, self.workspace_name)
            workspace['metadata'] = {'id': workspace_id}
        # else check that the workspace_id is valid.
        else:
            if 'id' not in workspace['metadata']:
                raise Exception('The `id` field is missing in `metadata`.')
            else:
                id = workspace['metadata']['id']
                if id != ujoin(base_url, app_url) and not id.startswith(ujoin(base_url, workspaces_url)):
                    error = '%s does not match app_url or start with workspaces_url.'
                    raise Exception(error % id)

        return workspace


class LabWorkspaceApp(JupyterApp):
    version = version
    description = """
    Import or export a JupyterLab workspace

    There are two sub-commands for export or import of workspaces. This app
        should not otherwise do any work.
    """
    subcommands = dict()
    subcommands['export'] = (
        LabWorkspaceExportApp,
        LabWorkspaceExportApp.description.splitlines()[0]
    )
    subcommands['import'] = (
        LabWorkspaceImportApp,
        LabWorkspaceImportApp.description.splitlines()[0]
    )

    def start(self):
        try:
            super().start()
            print('Either `export` or `import` must be specified.')
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)


class LabApp(NBClassicConfigShimMixin, LabServerApp):
    version = version

    name = "lab"
    app_name = "JupyterLab"

    # Should your extension expose other server extensions when launched directly?
    load_other_extensions = True

    description = """
    JupyterLab - An extensible computational environment for Jupyter.

    This launches a Tornado based HTML Server that serves up an
    HTML5/Javascript JupyterLab client.

    JupyterLab has three different modes of running:

    * Core mode (`--core-mode`): in this mode JupyterLab will run using the JavaScript
      assets contained in the installed `jupyterlab` Python package. In core mode, no
      extensions are enabled. This is the default in a stable JupyterLab release if you
      have no extensions installed.
    * Dev mode (`--dev-mode`): uses the unpublished local JavaScript packages in the
      `dev_mode` folder.  In this case JupyterLab will show a red stripe at the top of
      the page.  It can only be used if JupyterLab is installed as `pip install -e .`.
    * App mode: JupyterLab allows multiple JupyterLab "applications" to be
      created by the user with different combinations of extensions. The `--app-dir` can
      be used to set a directory for different applications. The default application
      path can be found using `jupyter lab path`.
    """

    examples = """
        jupyter lab                       # start JupyterLab
        jupyter lab --dev-mode            # start JupyterLab in development mode, with no extensions
        jupyter lab --core-mode           # start JupyterLab in core mode, with no extensions
        jupyter lab --app-dir=~/myjupyterlabapp # start JupyterLab with a particular set of extensions
        jupyter lab --certfile=mycert.pem # use SSL/TLS certificate
    """

    aliases['app-dir'] = 'LabApp.app_dir'
    aliases.update({
        'watch': 'LabApp.watch',
    })


    flags['core-mode'] = (
        {'LabApp': {'core_mode': True}},
        "Start the app in core mode."
    )
    flags['dev-mode'] = (
        {'LabApp': {'dev_mode': True}},
        "Start the app in dev mode for running from source."
    )
    flags['watch'] = (
        {'LabApp': {'watch': True}},
        "Start the app in watch mode."
    )
    flags['expose-app-in-browser'] = (
        {'LabApp': {'expose_app_in_browser': True}},
        "Expose the global app instance to browser via window.jupyterlab"
    )

    subcommands = dict(
        build=(LabBuildApp, LabBuildApp.description.splitlines()[0]),
        clean=(LabCleanApp, LabCleanApp.description.splitlines()[0]),
        path=(LabPathApp, LabPathApp.description.splitlines()[0]),
        paths=(LabPathApp, LabPathApp.description.splitlines()[0]),
        workspace=(LabWorkspaceApp, LabWorkspaceApp.description.splitlines()[0]),
        workspaces=(LabWorkspaceApp, LabWorkspaceApp.description.splitlines()[0])
    )

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`")

    override_static_url = Unicode(config=True, help=('The override url for static lab assets, typically a CDN.'))

    override_theme_url = Unicode(config=True, help=('The override url for static lab theme assets, typically a CDN.'))

    app_dir = Unicode(None, config=True,
        help="The app directory to launch JupyterLab from.")

    user_settings_dir = Unicode(get_user_settings_dir(), config=True,
        help="The directory for user settings.")

    workspaces_dir = Unicode(get_workspaces_dir(), config=True,
        help="The directory for workspaces")

    core_mode = Bool(False, config=True,
        help="""Whether to start the app in core mode. In this mode, JupyterLab
        will run using the JavaScript assets that are within the installed
        JupyterLab Python package. In core mode, third party extensions are disabled.
        The `--dev-mode` flag is an alias to this to be used when the Python package
        itself is installed in development mode (`pip install -e .`).
        """)

    dev_mode = Bool(False, config=True,
        help="""Whether to start the app in dev mode. Uses the unpublished local
        JavaScript packages in the `dev_mode` folder.  In this case JupyterLab will
        show a red stripe at the top of the page.  It can only be used if JupyterLab
        is installed as `pip install -e .`.
        """)

    watch = Bool(False, config=True,
        help="Whether to serve the app in watch mode")

    expose_app_in_browser = Bool(False, config=True,
        help="Whether to expose the global app instance to browser via window.jupyterlab")

    # By default, open a browser for JupyterLab
    serverapp_config = {
        "open_browser": True
    }

    @default('app_dir')
    def _default_app_dir(self):
        app_dir = get_app_dir()
        if self.core_mode:
            app_dir = HERE 
            self.log.info('Running JupyterLab in core mode')
        elif self.dev_mode:
            app_dir = DEV_DIR
            self.log.info('Running JupyterLab in dev mode')
        return app_dir

    @default('app_settings_dir')
    def _default_app_settings_dir(self):
        return pjoin(self.app_dir, 'settings')

    @default('app_version')
    def _default_app_version(self):
        info = get_app_info(app_options=AppOptions(app_dir=self.app_dir))
        return info['version']

    @default('cache_files')
    def _default_cache_files(self):
        return False

    @default('schemas_dir')
    def _default_schemas_dir(self):
        return pjoin(self.app_dir, 'schemas')

    @default('templates_dir')
    def _default_templates_dir(self):
        return pjoin(self.app_dir, 'static')

    @default('themes_dir')
    def _default_themes_dir(self):
        if self.override_theme_url:
            return ''
        return pjoin(self.app_dir, 'themes')

    @default('static_dir')
    def _default_static_dir(self):
        return pjoin(self.app_dir, 'static')

    @property
    def static_url_prefix(self):
        if self.override_static_url:
            return self.override_static_url
        else:
            return "/static/{name}/".format(
            name=self.name)

    @default('theme_url')
    def _default_theme_url(self):
        if self.override_theme_url:
            return self.override_theme_url
        return ''

    def initialize_templates(self):
        # Determine which model to run JupyterLab
        if self.core_mode or self.app_dir.startswith(HERE):
            self.core_mode = True
            self.log.info('Running JupyterLab in dev mode')

        if self.dev_mode or self.app_dir.startswith(DEV_DIR):
            self.dev_mode = True
            self.log.info('Running JupyterLab in dev mode')

        if self.watch and self.core_mode:
            self.log.warn('Cannot watch in core mode, did you mean --dev-mode?')
            self.watch = False

        if self.core_mode and self.dev_mode:
            self.log.warn('Conflicting modes, choosing dev_mode over core_mode')
            self.core_mode = False

        # Set the paths based on JupyterLab's mode.
        if self.dev_mode:
            dev_static_dir = ujoin(DEV_DIR, 'static')
            self.static_paths = [dev_static_dir]
            self.template_paths = [dev_static_dir]
            self.labextensions_path = []
            self.extra_labextensions_path = []
        elif self.core_mode:
            dev_static_dir = ujoin(HERE, 'static')
            self.static_paths = [dev_static_dir]
            self.template_paths = [dev_static_dir]
        else:
            self.static_paths = [self.static_dir]
            self.template_paths = [self.templates_dir]


    def initialize_settings(self):
        # FIXME: why isn't the default being applied?
        self.app_version = self._default_app_version()
        super().initialize_settings()


    def initialize_handlers(self):

        handlers = []

        # Set config for Jupyterlab
        page_config = self.serverapp.web_app.settings.setdefault('page_config_data', {})
        page_config.setdefault('buildAvailable', not self.core_mode and not self.dev_mode)
        page_config.setdefault('buildCheck', not self.core_mode and not self.dev_mode)
        page_config['devMode'] = self.dev_mode
        page_config['token'] = self.serverapp.token

        # Client-side code assumes notebookVersion is a JSON-encoded string
        page_config['notebookVersion'] = json.dumps(jpserver_version_info)

        if self.serverapp.file_to_run:
            relpath = os.path.relpath(self.serverapp.file_to_run, self.serverapp.root_dir)
            uri = url_escape(ujoin('{}/tree'.format(self.app_url), *relpath.split(os.sep)))
            self.default_url = uri
            self.serverapp.file_to_run = ''

        self.log.info('JupyterLab extension loaded from %s' % HERE)
        self.log.info('JupyterLab application directory is %s' % self.app_dir)

        build_handler_options = AppOptions(logger=self.log, app_dir=self.app_dir)
        builder = Builder(self.core_mode, app_options=build_handler_options)
        build_handler = (build_path, BuildHandler, {'builder': builder})
        handlers.append(build_handler)

        errored = False

        if self.core_mode:
            self.log.info(CORE_NOTE.strip())
            ensure_core(self.log)
        elif self.dev_mode:
            if not self.watch:
                ensure_dev(self.log)
                self.log.info(DEV_NOTE)
        else:
            msgs = ensure_app(self.app_dir)
            if msgs:
                [self.log.error(msg) for msg in msgs]
                handler = (self.app_url, ErrorHandler, { 'messages': msgs })
                handlers.append(handler)
                errored = True

        if self.watch:
            self.log.info('Starting JupyterLab watch mode...')
            if self.dev_mode:
                watch_dev(self.log)
            else:
                watch(app_options=build_handler_options)
                page_config['buildAvailable'] = False
            self.cache_files = False

        if not self.core_mode and not errored:
            ext_manager = ExtensionManager(app_options=build_handler_options)
            ext_handler = (
                extensions_handler_path,
                ExtensionHandler,
                {'manager': ext_manager}
            )
            handlers.append(ext_handler)

        # If running under JupyterHub, add more metadata.
        if hasattr(self, 'hub_prefix'):
            page_config['hubPrefix'] = self.hub_prefix
            page_config['hubHost'] = self.hub_host
            page_config['hubUser'] = self.user
            page_config['shareUrl'] = ujoin(self.hub_prefix, 'user-redirect')
            # Assume the server_name property indicates running JupyterHub 1.0.
            if hasattr(labapp, 'server_name'):
                page_config['hubServerName'] = self.server_name
            api_token = os.getenv('JUPYTERHUB_API_TOKEN', '')
            page_config['token'] = api_token

        # Handle dynamic extensions
        info = get_app_info()
        extensions = page_config['dynamic_extensions'] = []
        for (ext, ext_data) in info.get('dynamic_exts', dict()).items():
            extension = {
                'name': ext_data['name']
            }
            if ext_data['jupyterlab'].get('extension'):
                extension['plugin'] = './extension'
            if ext_data['jupyterlab'].get('mimeExtension'):
                extension['mimePlugin'] = './mimeExtension'
            if ext_data.get('style'):
                extension['style'] = './style'
            extensions.append(extension)

        # Update Jupyter Server's webapp settings with jupyterlab settings.
        self.serverapp.web_app.settings['page_config_data'] = page_config

        # Extend Server handlers with jupyterlab handlers.
        self.handlers.extend(handlers)
        super().initialize_handlers()

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance

if __name__ == '__main__':
    main()
