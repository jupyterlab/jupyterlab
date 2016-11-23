from ..flexx_plugin_manager import register_flexx_jlab_plugin

from flexx import app, event, ui
from flexx.ui.examples.mondriaan import Mondriaan


@register_flexx_jlab_plugin
class MondriaanPlugin(Mondriaan):
    """
    A plugin that provides flexbox art similar to Mondriaans style of painting.
    This is a standard Flexx example subclassed to be a jlab plugin.
    
    This shows the minimum amount of work to create a JLab plugin:
    implement jlab_activate(). JLAB_REQUIRES can also be defined as a
    class attribute to get access to more services in jlab_activate(),
    see e.g. the conda manager example.
    """
    
    class JS:
        
        def jlab_activate(self, lab):
            self.title = 'Mondriaan'
            lab.shell.addToMainArea(self.phosphor)
