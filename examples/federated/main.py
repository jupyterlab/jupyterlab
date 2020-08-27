# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab_server import LabServerApp, LabConfig
from jupyterlab_server.server import FileFindHandler
import json
import os
from traitlets import Unicode
from glob import glob

HERE = os.path.abspath(os.path.dirname(__file__))

# Turn off the Jupyter configuration system so configuration files on disk do
# not affect this app. This helps this app to truly be standalone.
os.environ["JUPYTER_NO_CONFIG"]="1"

with open(os.path.join(HERE, 'package.json')) as fid:
    version = json.load(fid)['version']

def _jupyter_server_extension_points():
    return [
        {
            'module': __name__,
            'app': ExampleApp
        }
    ]

class ExampleApp(LabServerApp):
    name = 'lab'
    load_other_extensions = False
    app_name = 'JupyterLab Example Federated App'
    app_settings_dir = os.path.join(HERE, 'build', 'application_settings')
    app_version = version
    schemas_dir = os.path.join(HERE, 'core_package', 'build', 'schemas')
    static_dir = os.path.join(HERE, 'core_package', 'build')
    templates_dir = os.path.join(HERE, 'templates')
    themes_dir = os.path.join(HERE, 'core_package', 'build', 'themes')
    user_settings_dir = os.path.join(HERE, 'core_package', 'build', 'user_settings')
    workspaces_dir = os.path.join(HERE, 'core_package', 'build', 'workspaces')
    labextensions_path =  [os.path.join(HERE, "labextensions")]

    def initialize_handlers(self):
        # Handle labextension assets
        web_app = self.serverapp.web_app
        base_url = web_app.settings['base_url']
        page_config = web_app.settings.get('page_config_data', {})
        web_app.settings['page_config_data'] = page_config

        # By default, make terminals available.
        web_app.settings.setdefault('terminals_available', True)

        # Extract the dynamic extension data from lab_extensions
        dynamic_exts = []
        for ext_path in [path for path in glob('./labextensions/**/package.json', recursive=True)]:
            with open(ext_path) as fid:
                data = json.load(fid)
            extbuild = data['jupyterlab']['_build']
            ext = {
                'name': data['name'],
                'load': extbuild['load'],
            }
            if 'extension' in extbuild:
                ext['extension'] = extbuild['extension']
            if 'mimeExtension' in extbuild:
                ext['mimeExtension'] = extbuild['mimeExtension']
            if 'style' in extbuild:
                ext['style'] = extbuild['style']
            dynamic_exts.append(ext)

        page_config['dynamic_extensions'] = dynamic_exts

        super().initialize_handlers()

if __name__ == '__main__':
    ExampleApp.launch_instance()
