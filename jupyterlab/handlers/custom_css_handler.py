import os
import re

from jupyter_core.paths import jupyter_config_dir
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin
from tornado import web


class CustomCssHandler(ExtensionHandlerMixin, JupyterHandler):
    """A custom CSS handler."""

    @property
    def custom_css(self):
        return self.settings.get("custom_css", True)

    def get_page_config(self):
        """Get the page config."""

        page_config_data = self.settings.setdefault("page_config_data", {})
        page_config = {**page_config_data}
        page_config.setdefault("jupyter_config_dir", jupyter_config_dir())
        return page_config

    @web.authenticated
    def get(self):
        """Get the custom css file."""

        self.set_header("Content-Type", 'text/css')
        page_config = self.get_page_config()
        custom_css_file = f"{page_config['jupyter_config_dir']}/custom/custom.css"

        if not os.path.isfile(custom_css_file):
            static_path_root = re.match('^(.*?)static', page_config['staticDir'])
            if static_path_root is not None:
                custom_dir = static_path_root.groups()[0]
                custom_css_file = f"{custom_dir}/custom/custom.css"

        with open(custom_css_file) as css_f:
            return self.write(css_f.read())
