// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  ChatboxPanel
} from '@jupyterlab/chatbox';


/**
 * The command IDs used by the chatbox plugin.
 */
namespace CommandIDs {
  export
  const clear = 'chatbox:clear';

  export
  const run = 'chatbox:post';

  export
  const linebreak = 'chatbox:linebreak';
};


/**
 * The chatbox widget content factory.
 */
export
const chatboxPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.chatbox',
  requires: [ICommandPalette, IEditorServices, IDocumentManager, ILayoutRestorer],
  autoStart: true,
  activate: activateChatbox
};


/**
 * Export the plugin as the default.
 */
export default chatboxPlugin;


/**
 * Activate the chatbox extension.
 */
function activateChatbox(app: JupyterLab, palette: ICommandPalette, editorServices: IEditorServices, docManager: IDocumentManager, restorer: ILayoutRestorer): void {
  const id = 'chatbox';
  let { commands, shell } = app;
  let category = 'Chatbox';
  let command: string;

  /**
   * Create a chatbox for a given path.
   */
  let editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  let contentFactory = new ChatboxPanel.ContentFactory({ editorFactory });
  let panel = new ChatboxPanel({
    rendermime: app.rendermime.clone(),
    contentFactory
  });

  // Add the chatbox panel to the tracker.
  panel.title.label = 'Chat';
  panel.id = id;

  restorer.add(panel, 'chatbox');

  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Chat',
    execute: args => {
      panel.chatbox.clear();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Post Chat Entry',
    execute: args => {
      panel.chatbox.post();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: args => {
      panel.chatbox.insertLinebreak();
    }
  });
  palette.addItem({ command, category });

  let updateDocumentContext = function (): void {
    let context = docManager.contextForWidget(shell.currentWidget);
    if (context && context.model.modelDB.isCollaborative) {
      if (!panel.isAttached) {
        shell.addToLeftArea(panel);
      }
      panel.context = context;
    }
  };

  app.restored.then(() => {
    updateDocumentContext();
  });
  shell.currentChanged.connect(updateDocumentContext);
}
