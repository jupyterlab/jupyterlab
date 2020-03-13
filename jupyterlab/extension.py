# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# ----------------------------------------------------------------------------
# Module globals
# ----------------------------------------------------------------------------
import os

DEV_NOTE = """You're running JupyterLab from source.
If you're working on the TypeScript sources of JupyterLab, try running

    jupyter lab --dev-mode --watch


to have the system incrementally watch and build JupyterLab for you, as you
make changes.
"""


CORE_NOTE = """
Running the core application with no additional extensions or settings
"""


def load_config(nbapp):
    """Load the JupyterLab configuration and defaults for a given application.
    """
    from jupyterlab_server import LabConfig
    from .commands import (
        get_app_dir,
        get_app_info,
        get_workspaces_dir,
        get_user_settings_dir,
        pjoin,
        AppOptions,
    )

    app_dir = getattr(nbapp, 'app_dir', get_app_dir())
    info = get_app_info(app_options=AppOptions(app_dir=app_dir))
    static_url = info['staticUrl']
    user_settings_dir = getattr(
        nbapp, 'user_settings_dir', get_user_settings_dir()
    )
    workspaces_dir = getattr(nbapp, 'workspaces_dir', get_workspaces_dir())

    config = LabConfig()
    config.app_dir = app_dir
    config.app_name = 'JupyterLab'
    config.app_namespace = 'jupyterlab'
    config.app_settings_dir = pjoin(app_dir, 'settings')
    config.app_version = info['version']
    config.cache_files = True
    config.schemas_dir = pjoin(app_dir, 'schemas')
    config.listings_dir = pjoin(app_dir, 'listings')
    config.templates_dir = pjoin(app_dir, 'static')
    config.themes_dir = pjoin(app_dir, 'themes')
    config.user_settings_dir = user_settings_dir
    config.workspaces_dir = workspaces_dir

    if getattr(nbapp, 'override_static_url', ''):
        static_url = nbapp.override_static_url
    if getattr(nbapp, 'override_theme_url', ''):
        config.themes_url = nbapp.override_theme_url
        config.themes_dir = ''

    if static_url:
        config.static_url = static_url
    else:
        config.static_dir = pjoin(app_dir, 'static')

    return config


def load_jupyter_server_extension(nbapp):
    """Load the JupyterLab server extension.
    """
    # Delay imports to speed up jlpmapp
    from json import dumps
    from jupyterlab_server import add_handlers
    from notebook.utils import url_path_join as ujoin, url_escape
    from notebook._version import version_info
    from tornado.ioloop import IOLoop
    from markupsafe import Markup
    from .handlers.build_handler import build_path, Builder, BuildHandler
    from .handlers.extension_manager_handler import (
        extensions_handler_path, ExtensionManager, ExtensionHandler
    )
    from .handlers.error_handler import ErrorHandler
    from .commands import (
        DEV_DIR, HERE, ensure_app, ensure_core, ensure_dev, watch,
        watch_dev, get_app_dir, AppOptions
    )

    web_app = nbapp.web_app
    logger = nbapp.log
    base_url = nbapp.base_url
    
    # Handle the app_dir
    app_dir = getattr(nbapp, 'app_dir', get_app_dir())

    build_handler_options = AppOptions(logger=logger, app_dir=app_dir)

    # Check for core mode.
    core_mode = False
    if getattr(nbapp, 'core_mode', False) or app_dir.startswith(HERE):
        app_dir = HERE
        core_mode = True
        logger.info('Running JupyterLab in core mode')

    # Check for dev mode.
    dev_mode = False
    if getattr(nbapp, 'dev_mode', False) or app_dir.startswith(DEV_DIR):
        app_dir = DEV_DIR
        dev_mode = True
        logger.info('Running JupyterLab in dev mode')

    # Set the value on nbapp so it will get picked up in load_config
    nbapp.app_dir = app_dir

    config = load_config(nbapp)
    config.app_name = 'JupyterLab'
    config.app_namespace = 'jupyterlab'

    config.app_url = '/lab'

    config.cache_files = True

    # Check for watch.
    watch_mode = getattr(nbapp, 'watch', False)

    if watch_mode and core_mode:
        logger.warn('Cannot watch in core mode, did you mean --dev-mode?')
        watch_mode = False

    if core_mode and dev_mode:
        logger.warn('Conflicting modes, choosing dev_mode over core_mode')
        core_mode = False

    page_config = web_app.settings.setdefault('page_config_data', dict())
    page_config.setdefault('buildAvailable', not core_mode and not dev_mode)
    page_config.setdefault('buildCheck', not core_mode and not dev_mode)
    page_config['devMode'] = dev_mode
    page_config['token'] = nbapp.token

    # Client-side code assumes notebookVersion is a JSON-encoded string
    page_config['notebookVersion'] = dumps(version_info)

    if nbapp.file_to_run and type(nbapp).__name__ == "LabApp":
        relpath = os.path.relpath(nbapp.file_to_run, nbapp.notebook_dir)
        uri = url_escape(ujoin('/lab/tree', *relpath.split(os.sep)))
        nbapp.default_url = uri
        nbapp.file_to_run = ''

    # Print messages.
    logger.info('JupyterLab extension loaded from %s' % HERE)
    logger.info('JupyterLab application directory is %s' % app_dir)

    build_url = ujoin(base_url, build_path)
    builder = Builder(core_mode, app_options=build_handler_options)
    build_handler = (build_url, BuildHandler, {'builder': builder})
    handlers = [build_handler]

    errored = False

    if core_mode:
        logger.info(CORE_NOTE.strip())
        ensure_core(logger)

    elif dev_mode:
        if not watch_mode:
            ensure_dev(logger)
            logger.info(DEV_NOTE)

    # Make sure the app dir exists.
    else:
        msgs = ensure_app(app_dir)
        if msgs:
            [logger.error(msg) for msg in msgs]
            handler = (ujoin(base_url, '/lab'), ErrorHandler, { 'messages': msgs })
            handlers.append(handler)
            errored = True

    if watch_mode:
        logger.info('Starting JupyterLab watch mode...')

        # Set the ioloop in case the watch fails.
        nbapp.ioloop = IOLoop.current()
        if dev_mode:
            watch_dev(logger)
        else:
            watch(app_options=build_handler_options)
            page_config['buildAvailable'] = False

        config.cache_files = False

    if not core_mode and not errored:
        ext_url = ujoin(base_url, extensions_handler_path)
        ext_manager = ExtensionManager(app_options=build_handler_options)
        ext_handler = (ext_url, ExtensionHandler, {'manager': ext_manager})
        handlers.append(ext_handler)

    # Must add before the root server handlers to avoid shadowing.
    web_app.add_handlers('.*$', handlers)

    # If running under JupyterHub, add more metadata.
    if hasattr(nbapp, 'hub_prefix'):
        page_config['hubPrefix'] = nbapp.hub_prefix
        page_config['hubHost'] = nbapp.hub_host
        page_config['hubUser'] = nbapp.user
        page_config['shareUrl'] = ujoin(nbapp.hub_prefix, 'user-redirect')
        # Assume the server_name property indicates running JupyterHub 1.0.
        if hasattr(nbapp, 'server_name'):
            page_config['hubServerName'] = nbapp.server_name
        api_token = os.getenv('JUPYTERHUB_API_TOKEN', '')
        page_config['token'] = api_token

    # Add the root handlers if we have not errored.
    if not errored:
        add_handlers(web_app, config)
