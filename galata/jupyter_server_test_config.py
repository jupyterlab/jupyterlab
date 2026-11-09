# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
from pathlib import Path
from tempfile import mkdtemp

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)
c.LabApp.dev_mode = True

# Give the kernels more time to compute the types of completions. IPython
# allows 400 ms per request, including the time to find the completions, so on
# a busy runner the completions after the first one can show `<unknown>`
# instead of their type. 10 s is less than the 15 s that the completer tests
# wait for the completer.
ipython_dir = Path(mkdtemp(prefix="galata-ipython-"))
kernel_config = ipython_dir / "profile_default" / "ipython_kernel_config.py"
kernel_config.parent.mkdir()
kernel_config.write_text("c.IPCompleter.jedi_compute_type_timeout = 10_000\n", encoding="utf-8")
os.environ["IPYTHONDIR"] = str(ipython_dir)

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
