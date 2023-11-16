import nox


@nox.session(venv_backend="conda")
def build(session):
    session.install("doit")
    session.run("doit", *session.posargs)
