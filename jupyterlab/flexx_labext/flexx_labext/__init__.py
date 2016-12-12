# Running `npm run build` will create static resources in the static
# directory of this Python package (and create that directory if necessary).

import os

from flexx import app, event


THIS_DIR = os.path.dirname(os.path.abspath(__file__))
flexx_app_name = 'jlab'  # must match that of server ext


STUB = """
module.exports = [
{
  id: 'flexx_labext',
  autoStart: true,
  activate: function(application) {
    window.meh = "flexx";
  }
}
]
"""

MANIFEST = """{
"name": "flexx_labext",
"files": ["flexx-core.js"]
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
    with open(os.path.join(THIS_DIR, 'static', 'flexx-core.js'), 'wb') as f:
        f.write(code.encode('utf-8'))
    with open(os.path.join(THIS_DIR, 'static', 'flexx_labext.MANIFEST'), 'wb') as f:
        f.write(MANIFEST.encode('utf-8'))
    
    # todo: can I not just point to this single file?
    
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
    """ Given a Tornado app, register Flexx' Tornado handlers and return
    a Flexx session object to obtain the JS and CSS assets.
    """
    
    # The server extension should have create the jlab app, for which
    # we create sessions here
    
    # Create session, tell it to ignore phosphor-all lib, because Flexx
    # is able to use JLab's Phosphor.
    session = app.manager.create_session(flexx_app_name)
    session.assets_to_ignore.add('phosphor-all.js')
    session.assets_to_ignore.add('phosphor-all.css')
    return session
