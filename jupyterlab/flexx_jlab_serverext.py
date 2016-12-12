"""
A Jupyter server extension to make Flexx load in Jupyterlab.

Enable using:

    jupyter notebook --NotebookApp.server_extensions="['flexx_jlab_serverext']"

Alternatively, add it to the config file. Read more in
http://jupyter-notebook.readthedocs.io/en/latest/extending/handlers.html#writing-a-notebook-server-extension

"""

from flexx import app, event


_plugin_classes = []

def register_flexx_jlab_plugin(cls):
    """ Call this with a subclass of ModelPlugin or WidgetPlugin to register
    it and load it in Jupyterlab.
    """
    if not (isinstance(cls, type) and issubclass(cls, app.Model)):
        raise TypeError('register_flexx_jlab_plugin() needs a Model class.')
    if not hasattr(cls.JS, 'jlab_activate'):
        raise TypeError('JupyterLab plugins need a jlab_activate_method() in JS.')
    _plugin_classes.append(cls)
    return cls  # allows using this function as a decorator


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
    
    # We want to deal with Tornado directly
    tornado_app = nb_server_app.web_app
    
    app_name = 'jlab'
    if app_name not in app.manager.get_app_names():
        # This should be run just once
        
        # Create Flexx tornado server object, but don't let it host; we only
        # realy need it for its call_later() method.
        app.create_server(host=False)
        # Specify the JLab app
        app.App(JupyterLabPluginWrapper).serve(app_name)
        # Add Flexx' handlers needed to server asset and websocket
        # todo: flexx should have a function for this
        tornado_app.add_handlers(r".*", [(r"/flexx/ws/(.*)", app._tornadoserver.WSHandler),
                                         (r"/flexx/(.*)", app._tornadoserver.MainHandler),
                                         ])
    

class JupyterLabPluginWrapper(app.Model):
    """ This model represents the Flexx application that is embedded
    in JupyterLab. It is a thin wrapper that takes care of instantiating
    and registering the Flexx plugins.
    """
    
    def init(self):
        self._plugins = []  # model instances
        #@self.init2()
        app.call_later(0.1, self.init2)
    
    def init2(self):
        # Instantiate plugins
        plugins = []
        with self:
            for cls in _plugin_classes:
                plugins.append(cls())
        # Set plugins property, so that we have access to it on the JS side
        for p in plugins:
            self.launch_plugin(p)
        
        # Keep plugins alive
        self._plugins = plugins
    
    @event.emitter
    def launch_plugin(self, p):
        """ Event emitted by the Python side to launch a new plugin.
        """
        return {'model': p}
    
    class JS:
        
        @event.connect('launch_plugin')
        def on_launch_plugin(self, *events):
            for ev in events:
                model = ev.model
                
                print('registering Flexx JLAB plugin ', model.id)
                
                func = model.jlab_activate
                autoStart = getattr(model, 'JLAB_AUTOSTART', True)
                requires = getattr(model, 'JLAB_REQUIRES', [])
                requires = [get_token(id) for id in requires]
                
                p = dict(id='flexx.' + model._class_name.lower(),
                         activate=func, autoStart=autoStart, requires=requires)
                window.jupyter.lab.registerPlugin(p)
                if p.autoStart:
                    # Autostart means activate when JLab starts, but JLab
                    # is already running so we need to start it ourselves.
                    window.jupyter.lab.activatePlugin(p.id)


def get_token(id):
    # Collect tokens of known services. Problems:
    # - We use a private attribute here
    # - Flexx does not support generators (yet), maybe its time?
    # This could be solved if we could access these tokens in 
    # another way.
    # todo: get rid of this by making plugins use `pyscript.RawJS` to import tokens
    tokens = []
    iter = window.jupyter.lab._serviceMap.keys()  
    while True:
        item = iter.next()
        tokens.append(item.value)
        if item.done:
            break
    # Check what token corresponds with the given service id
    for token in tokens:
        if token.name == id:
            return token
    else:
        raise RuntimeError('No service known by id "%s".' % id)