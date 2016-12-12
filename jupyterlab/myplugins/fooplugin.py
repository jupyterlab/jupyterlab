from flexx_labext import register_flexx_jlab_plugin

from flexx import app, event, ui


@register_flexx_jlab_plugin
class FooPlugin(ui.Widget):
    """
    A silly widget that demonstrates hooking up to Jlab services.
    
    * Uses the file browser service to keep track of its current dir.
    * Would like to add an entry to the document-registry, but Flexx cannot
      instantiate widgets from JS ...
    
    """
    
    def init(self):
        
        with ui.HBox():
            ui.Label(text = 'The curren path is:')
            self.label = ui.Label()
            ui.Widget(flex=1)
    
    class JS:
        
        JLAB_AUTOSTART = True
        JLAB_REQUIRES = ['jupyter.services.file-browser', 'jupyter.services.document-registry']
        
        def jlab_activate(self, lab, fb, dr):
            self.title = 'Flexx foo demo'
            
            # Add to JLab UI
            lab.shell.addToMainArea(self.phosphor)
            
            # Keep track of file-browser's current directory
            fb.pathChanged.connect(self._on_path_changed)
            self._on_path_changed(fb, {'newValue': fb.path})  # init
            
            # Ahhh, we cannot create a widget factory, as Flexx widgets
            # can only be instantiated from Python. It could work if we could
            # emit a signal from JS, and respond in Py by creating a widget,
            # but this does not seem to fit in JLabs widget factory pattern.
            window.dr = dr
        
        def _on_path_changed(self, fb, ev):
            self.label.text = '"' + ev.newValue + '"'
