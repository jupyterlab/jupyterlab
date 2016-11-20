from ..flexx_plugin_manager import register_flexx_jlab_plugin, WidgetPlugin

from flexx import app, event, ui
from flexx.ui.examples.chatroom import ChatRoom


@register_flexx_jlab_plugin
class ChatPlugin(WidgetPlugin):
    """
    A plugin that provides a widget exposing a chatroom that connects
    all users connected to this jlab server.
    
    The chat room is a standard Flexx example; we just wrap the widget
    in a plugin.
    """
    
    def init(self):
        with ui.BoxPanel():
            ChatRoom()
        
    class JS:
        
        def init(self):
            super().init()
            self.title = 'Chat room'
        
        def activate(self, lab):
            lab.shell.addToMainArea(self.phosphor)
