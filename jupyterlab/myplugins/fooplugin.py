from ..flexx_plugin_manager import register_flexx_jlab_plugin, WidgetPlugin

from flexx import app, event, ui


@register_flexx_jlab_plugin
class FooPlugin(WidgetPlugin):
    """
    A silly widget that hooks up to the file browser service, and also
    to the document-registry, except that it does not because Flexx cannot
    instantiate widgets from JS ...
    """
    
    def init(self):
        
        with ui.HBox():
            ui.Label(text = 'The curren path is:')
            self.label = ui.Label()
            ui.Widget(flex=1)
    
    class JS:
        
        JLAB_REQUIRES = ['jupyter.services.file-browser', 'jupyter.services.document-registry']
        JLAB_AUTOSTART = True
        
        def init(self):
            super().init()
            self.title = 'Flexx foo demo'
        
        def activate(self, lab, fb, dr):
            print('activating plugin', self.id)
            lab.shell.addToMainArea(self.phosphor)
            fb.pathChanged.connect(self._on_path_changed)
            
            # Ahhh, we cannot create a widget factory, as Flexx widgets
            # can only be instantiated from Python. It could work if we could
            # emit a signal from JS, and respond in Py by creating a widget,
            # but this does not seem to fit in JLabs widget factory pattern.
            window.dr = dr
        
        def _on_path_changed(self, fb, ev):
            print('path changed to ', ev.newValue)
            self.label.text = '&#8962;' + ev.newValue
