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
* ModelPlugin and WidgetPlugin classes for plugins to subclass.
"""

from flexx import app, ui


_plugin_classes = []

def register_flexx_jlab_plugin(cls):
    """ Call this with a subclass of ModelPlugin or WidgetPlugin to register
    it and load it in Jupyterlab.
    """
    if not (isinstance(cls, type) and issubclass(cls, app.Model))
        raise TypeError('register_flexx_jlab_plugin() needs a Model class.')
    if not issubclass(cls, (ModelPlugin, WidgetPlugin))):
        raise TypeError('register_flexx_jlab_plugin() needs a ModelPlugin or '
                        'WidgetPlugin.')
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
        tornado_app.add_handlers(r".*", [(r"/flexx/ws/(.*)", app.tornadoserver.WSHandler),
                                         (r"/flexx/(.*)", app.tornadoserver.MainHandler),
                                         ])
    
    # Create session
    session = app.manager.create_session(app_name)
    
    # Tell it that we're going to use widgets - to "use" flexx.ui._widget,
    # to pull in the phosphor-all assets.
    # todo: we can ditch this when we're using JLab's Phosphor
    session.register_model_class(ui.Widget)
    
    return session


class JupyterLabPluginWrapper(app.Model):
    """ This model represents the Flexx application that is embedded
    in JupyterLab. It is a thin wrapper that takes care of instantiating
    the Flexx plugins.
    """
    
    def init(self):
        # This is really just a silly test to ensure that call_later works
        app.call_later(0.1, self.init2)
        self._plugins = []  # model instances
    
    def init2(self):
        with self:
            for cls in _plugin_classes:
                self._plugins.append(cls())
        
        #self.call_js('jlab_attach("%s")' % self.w.id)


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


# Base classes to subclass to implement a plugin. A mixin would be nice
# here, but Flexx does not (yet) support multiple inhertance.

class ModelPlugin(app.Model):
    """ Subclass this to create a JLab plugin without a visual representation.
    """
    
    class JS:
        
        JLAB_REQUIRES = []
        JLAB_AUTOSTART = True
        
        def init(self):
            self._register()
        
        def _register(self):
            print('registering JLAB plugin ', self.id)
            p = dict(id='flexx.' + self._class_name.lower(),
                     activate=self.activate,
                     autoStart=self.JLAB_AUTOSTART,
                     requires=[get_token(id) for id in self.JLAB_REQUIRES])
            window.jupyter.lab.registerPlugin(p)
            if p.autoStart:
                # Autostart means activate when JLab starts, but JLab
                # is already running so we need to start it ourselves.
                window.jupyter.lab.activatePlugin(p.id)
        
        def activate(self):
            raise NotImplementedError()


class WidgetPlugin(ui.Widget):
    """ Subclass this to create a JLab plugin represented by a widget.
    """
    
    class JS:
        
        JLAB_REQUIRES = []
        JLAB_AUTOSTART = True
        
        def init(self):
            self.title = self.title if self.title else 'A Flexx plugin'
            self._register()
        
        def _register(self):
            print('registering JLAB plugin ', self.id)
            p = dict(id='flexx.' + self._class_name.lower(),
                     activate=self.activate,
                     autoStart=self.JLAB_AUTOSTART,
                     requires=[get_token(id) for id in self.JLAB_REQUIRES])
            window.jupyter.lab.registerPlugin(p)
            if p.autoStart:
                # Autostart means activate when JLab starts, but JLab
                # is already running so we need to start it ourselves.
                window.jupyter.lab.activatePlugin(p.id)
        
        def activate(self):
            raise NotImplementedError()
    