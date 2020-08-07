import os
import warnings

from traitlets import default

from .labapp import LabApp

try:
    from jupyterhub.singleuser import SingleUserNotebookApp
except ImportError:
    SingleUserLabApp = None
    raise ImportError('You must have jupyterhub installed for this to work.')
else:
    class SingleUserLabApp(SingleUserNotebookApp, LabApp):
        """
        A sublcass of JupyterHub's SingleUserNotebookApp which includes LabApp
        as a mixin. This makes the LabApp configurables available to the spawned
        jupyter server.

        If you don't need to change any of the configurables from their default
        values, then this class is not necessary, and you can deploy JupyterLab
        by ensuring that its server extension is enabled and setting the
        `Spawner.default_url` to '/lab'.

        If you do need to configure JupyterLab, then use this application by
        setting `Spawner.cmd = ['jupyter-labhub']`.
        """
        @default("default_url")
        def _default_url(self):
            """when using jupyter-labhub, jupyterlab is default ui"""
            return "/lab"


def main(argv=None):
    return SingleUserLabApp.launch_instance(argv)


if __name__ == "__main__":
    main()
