// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker, ILayoutRestorer,
  IMainMenu
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IChatboxTracker, ChatboxPanel
} from '@jupyterlab/chatbox';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  IRenderMime
} from '@jupyterlab/rendermime';


/**
 * The command IDs used by the chatbox plugin.
 */
namespace CommandIDs {
  export
  const create = 'chatbox:create';

  export
  const clear = 'chatbox:clear';

  export
  const run = 'chatbox:push';

  export
  const linebreak = 'chatbox:linebreak';
};

/**
 * The chatbox widget tracker provider.
 */
export
const trackerPlugin: JupyterLabPlugin<IChatboxTracker> = {
  id: 'jupyter.services.chatbox-tracker',
  provides: IChatboxTracker,
  requires: [
    IRenderMime,
    IMainMenu,
    ICommandPalette,
    ChatboxPanel.IContentFactory,
    IEditorServices,
    ILayoutRestorer
  ],
  optional: [ILauncher],
  activate: activateChatbox,
  autoStart: true
};


/**
 * The chatbox widget content factory.
 */
export
const contentFactoryPlugin: JupyterLabPlugin<ChatboxPanel.IContentFactory> = {
  id: 'jupyter.services.chatbox-renderer',
  provides: ChatboxPanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    let editorFactory = editorServices.factoryService.newInlineEditor.bind(
      editorServices.factoryService);
    return new ChatboxPanel.ContentFactory({ editorFactory });
  }
};


/**
 * Export the plugins as the default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin];
export default plugins;


/**
 * Activate the chatbox extension.
 */
function activateChatbox(app: JupyterLab, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, contentFactory: ChatboxPanel.IContentFactory,  editorServices: IEditorServices, restorer: ILayoutRestorer, launcher: ILauncher | null): IChatboxTracker {
  let { commands, shell } = app;
  let category = 'Chatbox';
  let command: string;
  let menu = new Menu({ commands });

  // Create an instance tracker for all chatbox panels.
  const tracker = new InstanceTracker<ChatboxPanel>({
    namespace: 'chatbox',
    shell
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      name: 'Chatbox',
      command: CommandIDs.create
    });
  }

  // Set the main menu title.
  menu.title.label = category;

  /**
   * Create a chatbox for a given path.
   */
  function createChatbox(options: Partial<ChatboxPanel.IOptions>): void {
    let panel = new ChatboxPanel({
      rendermime: rendermime.clone(),
      contentFactory,
      mimeTypeService: editorServices.mimeTypeService,
      ...options
    });

    // Add the chatbox panel to the tracker.
    panel.title.label = 'Chatbox';
    tracker.add(panel);
    shell.addToLeftArea(panel);
    tracker.activate(panel);
  }

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: 'Start New Chatbox',
    execute: (args: Partial<ChatboxPanel.IOptions>) => {
      let basePath = args.basePath || '.';
      createChatbox({ basePath, ...args });
      return Promise.resolve(void 0);
    }
  });
  palette.addItem({ command, category });

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: JSONObject): ChatboxPanel | null {
    let widget = tracker.currentWidget;
    let activate = args['activate'] !== false;
    if (activate && widget) {
      tracker.activate(widget);
    }
    return widget;
  }

  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.chatbox.clear();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.chatbox.execute();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.chatbox.insertLinebreak();
    }
  });
  palette.addItem({ command, category });

  menu.addItem({ command: CommandIDs.run });
  menu.addItem({ command: CommandIDs.linebreak });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.clear });
  menu.addItem({ type: 'separator' });

  mainMenu.addMenu(menu, {rank: 50});
  return tracker;
}
