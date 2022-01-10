import os

c.ServerApp.root_dir = os.environ.get("JUPYTERLAB_DEMO_DIR", ".")
c.ServerApp.port = 8888
c.ServerApp.port_retries = 0
c.ServerApp.open_browser = False

c.ServerApp.token = ""
c.ServerApp.password = ""
c.ServerApp.disable_check_xsrf = True
c.LabApp.expose_app_in_browser = True
