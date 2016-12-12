from flexx_labext import register_flexx_jlab_plugin

from flexx import app, event, ui
from flexx.ui.examples.chatroom import ChatRoom


@register_flexx_jlab_plugin
class ChatPlugin(ChatRoom):
    """
    A plugin that provides a widget exposing a chatroom that connects
    all users connected to this jlab server.
    
    The chat room is a standard Flexx example; we just extend the widget
    into a JLab plugin.
    """
    
    class JS:
        
        JLAB_AUTOSTART = True
        JLAB_REQUIRES = []
        
        def jlab_activate(self, lab):
            self.title = 'Chat room'
            lab.shell.addToMainArea(self.phosphor)
