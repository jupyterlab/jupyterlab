from ..flexx_plugin_manager import register_flexx_jlab_plugin, WidgetPlugin

from flexx import app, event, ui
from flexx.ui.examples.mondriaan import Mondriaan


@register_flexx_jlab_plugin
class MondriaanPlugin(WidgetPlugin):
    """
    A plugin that provides flexbox art similar to Mondriaans style of painting.
    This is a standard Flexx example; we just wrap the widget in a plugin.
    """
    
    def init(self):
        with ui.BoxPanel():
            Mondriaan()
        
    class JS:
        
        def init(self):
            super().init()
            self.title = 'Mondriaan'
        
        def activate(self, lab):
            lab.shell.addToMainArea(self.phosphor)
