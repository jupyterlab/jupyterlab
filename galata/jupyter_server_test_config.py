# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import getpass
import os
from tempfile import mkdtemp

# Test if we are running in a docker
if getpass.getuser() == "jovyan":
    c.ServerApp.ip = "0.0.0.0"

c.ServerApp.port = 8888
c.ServerApp.port_retries = 0
c.ServerApp.open_browser = False
c.LabApp.dev_mode = True

c.ServerApp.root_dir = os.environ.get("JUPYTERLAB_GALATA_ROOT_DIR", mkdtemp(prefix="galata-test-"))
c.ServerApp.token = ""
c.ServerApp.password = ""
c.ServerApp.disable_check_xsrf = True
c.LabApp.expose_app_in_browser = True

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
