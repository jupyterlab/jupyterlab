"""
A Jupyter server extension to make Flexx load in Jupyterlab.

Enable using:

    jupyter notebook --NotebookApp.server_extensions="['flexx_jlab_serverext']"

Alternatively, add it to the config file. Read more in
http://jupyter-notebook.readthedocs.io/en/latest/extending/handlers.html#writing-a-notebook-server-extension

"""

from flexx import app


def load_jupyter_server_extension(nb_server_app):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    if 'jupyterlab' in nb_server_app.description.lower():
        print('Loading the Flexx Jupyter server extension!')
    else:
        print('Only using Flexx in JupyterLab!')
        return
    
    tornado_app = nb_server_app.web_app
    
    # Add Flexx' handlers needed to server asset and websocket
    # todo: flexx should have a function for this
    tornado_app.add_handlers(r".*", [(r"/flexx/ws/(.*)", app._tornadoserver.WSHandler),
                                        (r"/flexx/(.*)", app._tornadoserver.MainHandler),
                                         ])
    
