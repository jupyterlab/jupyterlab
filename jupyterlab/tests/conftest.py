import pytest

from jupyterlab import __version__
from jupyterlab.handlers.announcements import (
    CheckForUpdate,
    CheckForUpdateHandler,
    NewsHandler,
    check_update_handler_path,
    news_handler_path,
)


@pytest.fixture
def labserverapp(jp_serverapp, make_labserver_extension_app):
    app = make_labserver_extension_app()
    app._link_jupyter_server_extension(jp_serverapp)
    app.handlers.extend(
        [
            (
                check_update_handler_path,
                CheckForUpdateHandler,
                {
                    "update_checker": CheckForUpdate(__version__),
                },
            ),
            (
                news_handler_path,
                NewsHandler,
                {
                    "news_url": "https://dummy.io/feed.xml",
                },
            ),
        ]
    )
    app.initialize()
    return app
