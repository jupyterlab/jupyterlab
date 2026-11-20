# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)
c.LabApp.dev_mode = True

# Ask the browser to check Trusted Types and report violations,
# without blocking anything.
c.ServerApp.tornado_settings = {
    "headers": {
        "Content-Security-Policy-Report-Only": (
            "require-trusted-types-for 'script'; report-uri /api/security/csp-report"
        )
    }
}
