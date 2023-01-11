import sys

from jupyter_server.utils import url_path_join
from tornado.web import RedirectHandler


def load_jupyter_server_extension(serverapp):
    from .labapp import LabApp

    """Temporary server extension shim when using
    old notebook server.
    """
    serverapp.log.warning("Loading JupyterLab as a classic notebook (v6) extension.")
    from jupyter_server._version import __version__
    try:
        from packaging.version import parse, Version
        if parse(__version__) >= Version('2.0.0'):
            serverapp.log.critical(
                f"You must use Jupyter Server v1 to load JupyterLab as notebook extension. You have v{__version__} installed.\nYou can fix this by executing:\n    pip install -U \"jupyter-server<2.0.0\""
            )
            if serverapp.default_url == "/lab":
                sys.exit(1)
            else:
                # Don't load JupyterLab when launching notebook
                return
    except Exception: # noqa
        pass

    extension = LabApp()
    extension.serverapp = serverapp
    extension.load_config_file()
    extension.update_config(serverapp.config)
    extension.parse_command_line(serverapp.extra_args)
    extension.handlers.extend(
        [
            (
                r"/static/favicons/favicon.ico",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/favicon.ico")},
            ),
            (
                r"/static/favicons/favicon-busy-1.ico",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/favicon-busy-1.ico")},
            ),
            (
                r"/static/favicons/favicon-busy-2.ico",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/favicon-busy-2.ico")},
            ),
            (
                r"/static/favicons/favicon-busy-3.ico",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/favicon-busy-3.ico")},
            ),
            (
                r"/static/favicons/favicon-file.ico",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/favicon-file.ico")},
            ),
            (
                r"/static/favicons/favicon-notebook.ico",
                RedirectHandler,
                {
                    "url": url_path_join(
                        serverapp.base_url, "static/base/images/favicon-notebook.ico"
                    )
                },
            ),
            (
                r"/static/favicons/favicon-terminal.ico",
                RedirectHandler,
                {
                    "url": url_path_join(
                        serverapp.base_url, "static/base/images/favicon-terminal.ico"
                    )
                },
            ),
            (
                r"/static/logo/logo.png",
                RedirectHandler,
                {"url": url_path_join(serverapp.base_url, "static/base/images/logo.png")},
            ),
        ]
    )
    extension.initialize()
