# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import zmq

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)
c.LabApp.dev_mode = True

# Kernels use Unix sockets: with TCP, the server picks each kernel's ports
# before the kernel binds them, and a kernel starting at the same time can bind
# one of them first, so the new kernel fails to start (jupyter/jupyter_client#487)
if zmq.has("ipc"):
    c.KernelManager.transport = "ipc"

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
