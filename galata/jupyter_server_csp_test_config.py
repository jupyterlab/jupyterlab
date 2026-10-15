# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)
c.LabApp.dev_mode = True
c.ServerApp.allow_origin = "null"
c.ServerApp.tornado_settings = {"headers": {"Content-Security-Policy": "sandbox allow-scripts"}}
