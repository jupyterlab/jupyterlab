# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os

from jupyterlab.galata import configure_jupyter_server

# Static IPython banner for reproducible documentation screenshots
os.environ.setdefault("SOURCE_DATE_EPOCH", "1704067200")

configure_jupyter_server(c)
c.LabApp.dev_mode = True

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
