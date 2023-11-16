# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import nox


@nox.session(venv_backend="conda")
def build(session):
    session.install("doit")
    session.run("doit", *session.posargs)
