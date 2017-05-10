// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  CompleterModel, Completer, CompletionHandler, ICompletionManager
} from '@jupyterlab/completer';

import {
  IConsoleTracker
} from '@jupyterlab/console';

import {
  INotebookTracker
} from '@jupyterlab/notebook';



/**
 * The command IDs used by the completer plugin.
 */
namespace CommandIDs {
  export
  const invoke = 'completer:invoke';

  export
  const invokeConsole = 'completer:invoke-console';

  export
  const invokeNotebook = 'completer:invoke-notebook';

  export
  const select = 'completer:select';

  export
  const selectConsole = 'completer:select-console';

  export
  const selectNotebook = 'completer:select-notebook';
}


/**
 * A service providing code completion for editors.
 */
const service: JupyterLabPlugin<ICompletionManager> = {
  id: 'jupyter.services.completer',
  autoStart: true,
  provides: ICompletionManager,
  activate: (app: JupyterLab): ICompletionManager => {
    const handlers: { [id: string]: CompletionHandler } = {};

    app.commands.addCommand(CommandIDs.invoke, {
      execute: args => {
        let id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const handler = handlers[id];
        if (handler) {
          handler.invoke();
        }
      }
    });

    app.commands.addCommand(CommandIDs.select, {
      execute: args => {
        let id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const handler = handlers[id];
        if (handler) {
          handler.completer.selectActive();
        }
      }
    });

    return {
      register: (completable: ICompletionManager.ICompletable): ICompletionManager.ICompletableAttributes => {
        const { editor, session, parent } = completable;
        const model = new CompleterModel();
        const completer = new Completer({ editor, model });
        const handler = new CompletionHandler({ completer, session });
        const id = parent.id;

        // Hide the widget when it first loads.
        completer.hide();

        // Associate the handler with the parent widget.
        handlers[id] = handler;

        // Set the handler's editor.
        handler.editor = editor;

        // Attach the completer widget.
        Widget.attach(completer, document.body);

        // Listen for parent disposal.
        parent.disposed.connect(() => {
          delete handlers[id];
          model.dispose();
          completer.dispose();
          handler.dispose();
        });

        return handler;
      }
    };
  }
};


/**
 * An extension that registers consoles for code completion.
 */
const consolePlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.console-completer',
  requires: [ICompletionManager, IConsoleTracker],
  autoStart: true,
  activate: (app: JupyterLab, manager: ICompletionManager, consoles: IConsoleTracker): void => {
    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, panel) => {
      const anchor = panel.console;
      const cell = anchor.promptCell;
      const editor = cell && cell.editor;
      const session = anchor.session;
      const parent = panel;
      const handler = manager.register({ editor, session, parent });

      // Listen for prompt creation.
      anchor.promptCellCreated.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
      });
    });

    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;
        if (!id) {
          return;
        }
        return app.commands.execute(CommandIDs.invoke, { id });
      }
    });

    // Add console completer select command.
    app.commands.addCommand(CommandIDs.selectConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;
        if (!id) {
          return;
        }
        return app.commands.execute(CommandIDs.select, { id });
      }
    });

    // Set enter key for console completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectConsole,
      keys: ['Enter'],
      selector: `.jp-ConsolePanel .jp-mod-completer-active`
    });
  }
};

/**
 * An extension that registers notebooks for code completion.
 */
const notebookPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.notebook-completer',
  requires: [ICompletionManager, INotebookTracker],
  autoStart: true,
  activate: (app: JupyterLab, manager: ICompletionManager, notebooks: INotebookTracker): void => {
    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, panel) => {
      const cell = panel.notebook.activeCell;
      const editor = cell && cell.editor;
      const session = panel.session;
      const parent = panel;
      const handler = manager.register({ editor, session, parent });

      // Listen for active cell changes.
      panel.notebook.activeCellChanged.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
      });
    });

    // Add notebook completer command.
    app.commands.addCommand(CommandIDs.invokeNotebook, {
      execute: () => {
        const panel = notebooks.currentWidget;
        if (panel && panel.notebook.activeCell.model.type === 'code') {
          return app.commands.execute(CommandIDs.invoke, { id: panel.id });
        }
      }
    });

    // Add notebook completer select command.
    app.commands.addCommand(CommandIDs.selectNotebook, {
      execute: () => {
        const id = notebooks.currentWidget && notebooks.currentWidget.id;
        if (!id) {
          return;
        }
        return app.commands.execute(CommandIDs.select, { id });
      }
    });

    // Set enter key for notebook completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectNotebook,
      keys: ['Enter'],
      selector: `.jp-Notebook .jp-mod-completer-active`
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  service, consolePlugin, notebookPlugin
];
export default plugins;
