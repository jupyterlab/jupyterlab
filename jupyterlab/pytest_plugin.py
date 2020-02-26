import pytest, shutil, os

from jupyterlab import LabApp
from jupyterlab_server import LabConfig

from traitlets import Unicode

from jupyterlab_server.tests.utils import here
from jupyterlab_server.app import LabServerApp

def mkdir(tmp_path, *parts):
    path = tmp_path.joinpath(*parts)
    if not path.exists():
        path.mkdir(parents=True)
    return path

app_settings_dir = pytest.fixture(lambda tmp_path: mkdir(tmp_path, 'app_settings'))
user_settings_dir = pytest.fixture(lambda tmp_path: mkdir(tmp_path, 'user_settings'))
schemas_dir = pytest.fixture(lambda tmp_path: mkdir(tmp_path, 'schemas'))
workspaces_dir = pytest.fixture(lambda tmp_path: mkdir(tmp_path, 'workspaces'))

@pytest.fixture
def make_lab_extension_app(root_dir, template_dir, app_settings_dir, user_settings_dir, schemas_dir, workspaces_dir):
    def _make_lab_extension_app(**kwargs):
        class TestLabServerApp(LabApp):
            base_url = '/lab'
            default_url = Unicode('/',
                                help='The default URL to redirect to from `/`')
            lab_config = LabConfig(
                app_name = 'JupyterLab Test App',
                static_dir = str(root_dir),
                templates_dir = str(template_dir),
                app_url = '/lab',
                app_settings_dir = str(app_settings_dir),
                user_settings_dir = str(user_settings_dir),
                schemas_dir = str(schemas_dir),
                workspaces_dir = str(workspaces_dir),
            )
        app = TestLabServerApp()
        return app

    # Create the index files.
    index = template_dir.joinpath('index.html')
    index.write_text("""
<!DOCTYPE html>
<html>
<head>
  <title>{{page_config['appName'] | e}}</title>
</head>
<body>
    {# Copy so we do not modify the page_config with updates. #}
    {% set page_config_full = page_config.copy() %}
    
    {# Set a dummy variable - we just want the side effect of the update. #}
    {% set _ = page_config_full.update(baseUrl=base_url, wsUrl=ws_url) %}
    
      <script id="jupyter-config-data" type="application/json">
        {{ page_config_full | tojson }}
      </script>
  <script src="{{page_config['fullStaticUrl'] | e}}/bundle.js" main="index"></script>

  <script type="text/javascript">
    /* Remove token from URL. */
    (function () {
      var parsedUrl = new URL(window.location.href);
      if (parsedUrl.searchParams.get('token')) {
        parsedUrl.searchParams.delete('token');
        window.history.replaceState({ }, '', parsedUrl.href);
      }
    })();
  </script>
</body>
</html>
""")

    return _make_lab_extension_app


@pytest.fixture
def labserverapp(serverapp, make_lab_extension_app):
    app = make_lab_extension_app()
    app.initialize(serverapp)
    return app
