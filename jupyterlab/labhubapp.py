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

        @default("default_url")
        def _default_url(self):
            """when using jupyter-labhub, jupyterlab is default ui"""
            return "/lab"

        def init_webapp(self, *args, **kwargs):
            warnings.warn(
                "SingleUserLabApp is deprecated, use SingleUserNotebookApp and set " + \
                "c.Spawner.default_url = '/lab' in jupyterhub_config.py", DeprecationWarning
            )
            super().init_webapp(*args, **kwargs)


def main(argv=None):
    return SingleUserLabApp.launch_instance(argv)


if __name__ == "__main__":
    main()
