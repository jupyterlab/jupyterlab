// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  find
} from '@phosphor/algorithm';

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
  Dialog, ICommandPalette, InstanceTracker, ILayoutRestorer,
  IMainMenu, showDialog
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
  const run = 'chatbox:run';

  export
  const runForced = 'chatbox:run-forced';

  export
  const linebreak = 'chatbox:linebreak';

  export
  const interrupt = 'chatbox:interrupt-kernel';

  export
  const restart = 'chatbox:restart-kernel';

  export
  const closeAndShutdown = 'chatbox:close-and-shutdown';

  export
  const open = 'chatbox:open';

  export
  const inject = 'chatbox:inject';

  export
  const switchKernel = 'chatbox:switch-kernel';
};

/**
 * The chatbox widget tracker provider.
 */
export
const trackerPlugin: JupyterLabPlugin<IChatboxTracker> = {
  id: 'jupyter.services.chatbox-tracker',
  provides: IChatboxTracker,
  requires: [
    IServiceManager,
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
function activateChatbox(app: JupyterLab, manager: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, contentFactory: ChatboxPanel.IContentFactory,  editorServices: IEditorServices, restorer: ILayoutRestorer, launcher: ILauncher | null): IChatboxTracker {
  let { commands, shell } = app;
  let category = 'Chatbox';
  let command: string;
  let menu = new Menu({ commands });

  // Create an instance tracker for all chatbox panels.
  const tracker = new InstanceTracker<ChatboxPanel>({
    namespace: 'chatbox',
    shell
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: panel => ({
      path: panel.chatbox.session.path,
      name: panel.chatbox.session.name
    }),
    name: panel => panel.chatbox.session.path,
    when: manager.ready
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
  function createChatbox(options: Partial<ChatboxPanel.IOptions>): Promise<void> {
    return manager.ready.then(() => {
      let panel = new ChatboxPanel({
        manager,
        rendermime: rendermime.clone(),
        contentFactory,
        mimeTypeService: editorServices.mimeTypeService,
        ...options
      });

      // Add the chatbox panel to the tracker.
      tracker.add(panel);
      shell.addToMainArea(panel);
      tracker.activate(panel);
    });
  }

  command = CommandIDs.open;
  commands.addCommand(command, {
    execute: (args: Partial<ChatboxPanel.IOptions>) => {
      let path = args['path'];
      let widget = tracker.find(value => {
        if (value.chatbox.session.path === path) {
          return true;
        }
      });
      if (widget) {
        tracker.activate(widget);
      } else {
        return manager.ready.then(() => {
          let model = find(manager.sessions.running(), item => {
            return item.path === path;
          });
          if (model) {
            return createChatbox(args);
          }
        });
      }
    }
  });

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: 'Start New Chatbox',
    execute: (args: Partial<ChatboxPanel.IOptions>) => {
      args.basePath = args.basePath || '.';
      return createChatbox(args);
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

  command = CommandIDs.runForced;
  commands.addCommand(command, {
    label: 'Run Cell (forced)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.chatbox.execute(true);
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

  command = CommandIDs.interrupt;
  commands.addCommand(command, {
    label: 'Interrupt Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let kernel = current.chatbox.session.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.restart;
  commands.addCommand(command, {
    label: 'Restart Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.chatbox.session.restart();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.closeAndShutdown;
  commands.addCommand(command, {
    label: 'Close and Shutdown',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return showDialog({
        title: 'Shutdown the chatbox?',
        body: `Are you sure you want to close "${current.title.label}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.accept) {
          current.chatbox.session.shutdown().then(() => {
            current.dispose();
          });
        } else {
          return false;
        }
    });
    }
  });

  command = CommandIDs.inject;
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let path = args['path'];
      tracker.find(widget => {
        if (widget.chatbox.session.path === path) {
          if (args['activate'] !== false) {
            tracker.activate(widget);
          }
          widget.chatbox.inject(args['code'] as string);
          return true;
        }
      });
    }
  });

  command = CommandIDs.switchKernel;
  commands.addCommand(command, {
    label: 'Switch Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.chatbox.session.selectKernel();
    }
  });
  palette.addItem({ command, category });

  menu.addItem({ command: CommandIDs.run });
  menu.addItem({ command: CommandIDs.runForced });
  menu.addItem({ command: CommandIDs.linebreak });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.clear });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.interrupt });
  menu.addItem({ command: CommandIDs.restart });
  menu.addItem({ command: CommandIDs.switchKernel });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.closeAndShutdown });

  mainMenu.addMenu(menu, {rank: 50});
  return tracker;
}
