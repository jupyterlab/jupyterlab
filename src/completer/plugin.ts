// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IConsoleTracker
} from '../console';

import {
  INotebookTracker
} from '../notebook';

import {
  CommandIDs, CompleterModel, CompleterWidget, CompletionHandler,
  ICompletionManager
} from './';


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
        let id = args['id'] as string;
        if (!id) {
          return;
        }

        const handler = handlers[id];
        if (handler) {
          handler.invoke();
        }
      }
    });

    return {
      register: (completable: ICompletionManager.ICompletable): ICompletionManager.ICompletableAttributes => {
        const { anchor, editor, kernel, parent } = completable;
        const model = new CompleterModel();
        const completer = new CompleterWidget({ anchor, model });
        const handler = new CompletionHandler({ completer, kernel });
        const id = parent.id;

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
      const cell = anchor.prompt;
      const editor = cell && cell.editor;
      const kernel = anchor.session.kernel;
      const parent = panel;
      const handler = manager.register({ anchor, editor, kernel, parent });

      // Listen for prompt creation.
      anchor.promptCreated.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
      });

      // Listen for kernel changes.
      anchor.session.kernelChanged.connect((sender, kernel) => {
        handler.kernel = kernel;
      });
    });

    // Add console completer command.
    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;
        if (!id) {
          return;
        }
        return app.commands.execute(CommandIDs.invoke, { id });
      }
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
      const anchor = panel.notebook;
      const cell = panel.notebook.activeCell;
      const editor = cell && cell.editor;
      const kernel = panel.kernel;
      const parent = panel;
      const handler = manager.register({ anchor, editor, kernel, parent });

      // Listen for active cell changes.
      panel.notebook.activeCellChanged.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
      });

      // Listen for kernel changes.
      panel.kernelChanged.connect((sender, kernel) => {
        handler.kernel = kernel;
      });
    });

    // Add notebook completer command.
    app.commands.addCommand(CommandIDs.invokeNotebook, {
      execute: () => {
        const id = notebooks.currentWidget && notebooks.currentWidget.id;
        return app.commands.execute(CommandIDs.invoke, { id });
      }
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
