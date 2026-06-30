# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""A standalone application demonstrating localization."""

import json
import os

from jupyter_server.base.handlers import APIHandler, JupyterHandler
from jupyter_server.extension.handler import ExtensionHandlerJinjaMixin, ExtensionHandlerMixin
from jupyter_server.utils import url_path_join as ujoin
from jupyterlab_server import LabServerApp
from tornado import web

HERE = os.path.dirname(__file__)
DOMAIN = "jupyterlab_localization_example"
LANGUAGES = {
    "en": {"displayName": "English", "nativeName": "English"},
    "es": {"displayName": "Spanish", "nativeName": "Español"},
}
CATALOGS = {
    "es": os.path.join(HERE, "locale", "es", "LC_MESSAGES", f"{DOMAIN}.json"),
}

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


def _jupyter_server_extension_points():
    return [{"module": __name__, "app": ExampleApp}]


class ExampleHandler(ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler):
    """Render the localization example."""

    def get(self):
        config_data = {
            "appName": "JupyterLab Localization Example",
            "appVersion": version,
            "baseUrl": self.base_url,
            "token": self.settings["token"],
            "fullStaticUrl": ujoin(self.base_url, "static", self.name),
            "frontendUrl": ujoin(self.base_url, "example/"),
            "translationsApiUrl": ujoin("example", "api", "translations"),
        }
        return self.write(
            self.render_template(
                "index.html",
                static=self.static_url,
                base_url=self.base_url,
                token=self.settings["token"],
                page_config=config_data,
            )
        )


class ExampleTranslationsHandler(APIHandler):
    """Serve the translation catalogs bundled with this example."""

    def initialize(self, catalogs, domain, languages):
        self.catalogs = catalogs
        self.domain = domain
        self.languages = languages

    @web.authenticated
    def get(self, locale=None):
        if locale is None:
            data = self.languages
            message = ""
        else:
            locale = "en" if locale == "default" else locale
            catalog_path = self.catalogs.get(locale)
            if locale == "en":
                data = {}
                message = ""
            elif catalog_path is None:
                data = {}
                message = f"Language pack '{locale}' not installed!"
            else:
                with open(catalog_path, encoding="utf-8") as fid:
                    data = {self.domain: json.load(fid)}
                message = ""

        self.finish(json.dumps({"data": data, "message": message}, ensure_ascii=False))


class ExampleApp(LabServerApp):
    extension_url = "/example"
    default_url = "/example"
    app_url = "/example"
    name = __name__
    load_other_extensions = False
    app_name = "JupyterLab Localization Example"
    static_dir = os.path.join(HERE, "build")
    templates_dir = os.path.join(HERE, "templates")
    app_version = version
    app_settings_dir = os.path.join(HERE, "build", "application_settings")
    schemas_dir = os.path.join(HERE, "build", "schemas")
    themes_dir = os.path.join(HERE, "build", "themes")
    user_settings_dir = os.path.join(HERE, "build", "user_settings")
    workspaces_dir = os.path.join(HERE, "build", "workspaces")

    def initialize_handlers(self):
        handler_options = {"catalogs": CATALOGS, "domain": DOMAIN, "languages": LANGUAGES}
        self.handlers.extend(
            [
                (r"/example/api/translations/?", ExampleTranslationsHandler, handler_options),
                (
                    r"/example/api/translations/(?P<locale>[^/]+)/?",
                    ExampleTranslationsHandler,
                    handler_options,
                ),
                ("/example", ExampleHandler),
            ]
        )


if __name__ == "__main__":
    ExampleApp.launch_instance()
