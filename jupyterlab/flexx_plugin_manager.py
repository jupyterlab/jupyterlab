"""
This module represents the package that enables making JLab plugins
using Flexx. It should probably become part of the same Python package
that provides the (JavaScrip) plugin that provided any hooks that we
might need.

Provides:

* get_session() JLab needs to call this to hook Flexx up and to get access
  to JS and CSS assets to add to the page.
* function register_flexx_jlab_plugin() to register Flexx models or
  widgets as JLab plugins.
"""

from flexx import app, event, ui
from flexx.ui import Widget


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


def get_session(tornado_app):
    """ Given a Tornado app, register Flexx' Tornado handlers and return
    a Flexx session object to obtain the JS and CSS assets.
    """
    
    app_name = 'jlab'
    if app_name not in app.manager.get_app_names():
        # This should be run just once
        
        # Create Flexx tornado server object, but don't let it host; we only
        # realy need it for its call_later() method.
        app.create_server(host=False)
        # Specify the JLab app
        app.App(JupyterLabPluginWrapper).serve(app_name)
        # Add Flexx' handlers needed to server asset and websocket
        tornado_app.add_handlers(r".*", [(r"/flexx/ws/(.*)", app._tornadoserver.WSHandler),
                                         (r"/flexx/(.*)", app._tornadoserver.MainHandler),
                                         ])
    
    # Create session, tell it to ignore phosphor-all lib, because Flexx
    # is able to use JLab's Phosphor.
    session = app.manager.create_session(app_name)
    session.assets_to_ignore.add('phosphor-all.js')
    session.assets_to_ignore.add('phosphor-all.css')
    return session


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
    # todo: is there a public way to get access to token via its id?
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
