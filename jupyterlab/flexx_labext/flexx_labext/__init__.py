"""
This module represents the flexx_labext labextension, which is used
to create a new session for each page load, and to provide the page
with the session id.

Would be nice if somewhere in this extension we could get ahold of the
tornado application object, so that we can register Flexx' handlers. Then
we would not need the server extension anymore.

Also we need to jump through hoops to make the extsion work, because
the extension system is rather oriented for extensions written in Typescript.
"""
import errno
import os

from flexx import app, event


THIS_DIR = os.path.dirname(os.path.abspath(__file__))
flexx_app_name = 'jlab'


MANIFEST = """{
"name": "flexx_labext",
"entry": "flexx@1.0/dummy.js",
"files": ["flexx-core.js"],
"modules": {
    "flexx@1.0/dummy.js": []
}
}"""


# # These will naturally NOT be in jupyterlab eventually
# from jupyterlab.myplugins import mondriaanplugin
# from jupyterlab.myplugins import chatplugin
# from jupyterlab.myplugins import condamanagerplugin
# from jupyterlab.myplugins import fooplugin


def _jupyter_labextension_paths():
    # This is called once, when the server starts.
    # It must return a dict that describes the lab extension.
    
    print('inside Flexx _jupyter_labextension_paths')
    
    # Write flexx bootstap js
    code = app.assets.get_asset('flexx-core.js').to_string()
    path = os.path.join(THIS_DIR, 'static')
    try:
        os.makedirs(path)
    except OSError as exc:  # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise
    with open(os.path.join(path, 'flexx-core.js'), 'wb') as f:
        f.write(code.encode('utf-8'))
    with open(os.path.join(path, 'flexx_labext.manifest'), 'wb') as f:
        f.write(MANIFEST.encode('utf-8'))
    
    return [{
        'name': 'flexx_labext',
        'src': 'static',
    }]


def _jupyter_labextension_config():
    # This (optional function) is called at each launch of the `/lab` page.
    # It must return a dict with config options to supply to the client.
    # We use it to instantiate a session too.
    
    print('inside Flexx _jupyter_labextension_config - getting session')
    
    # The application arg is a NotebookWebApplication, which ultimately derives
    # from the Tornado application class.
    session = get_session()
    
    return {'flexx_app_name': flexx_app_name, 'flexx_session_id': session.id}


def get_session():
    """ Get session instance for the flexx jlab app.
    """
    
    # The server extension should have create the jlab app, for which
    # we create sessions here
    
    if flexx_app_name not in app.manager.get_app_names():
        # This should be run just once
        
        # Create Flexx tornado server object, but don't let it host; we only
        # realy need it for its call_later() method.
        app.create_server(host=False)
        # Specify the JLab app
        app.App(JupyterLabPluginWrapper).serve(flexx_app_name)
    
    # Create session, tell it to ignore phosphor-all lib, because Flexx
    # is able to use JLab's Phosphor.
    session = app.manager.create_session(flexx_app_name)
    session.assets_to_ignore.add('phosphor-all.js')
    session.assets_to_ignore.add('phosphor-all.css')
    return session


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
