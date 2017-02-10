// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Keymap
} from 'phosphor/lib/ui/keymap';

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
  CommandIDs, COMPLETABLE_CLASS,
  CompleterModel, CompleterWidget, CompletionHandler, ICompletionManager
} from './';


/**
 * The keyboard shortcut used to invoke a completer.
 *
 * #### Notes
 * The limitation of only supporting a single character completer invocation
 * shortcut stems from the fact that the current application-level APIs only
 * support adding shortcuts that are processed in the bubble phase of keydown
 * events.
 * Therefore, TODO: after upgrading to phosphor 1.0
 * - remove the `interrupt` function in the invoke commands
 * - switch the invoke commands to be processed in the capture phase
 * - remove the `shortcut` const and allow arbitrary shortcuts
 */
const shortcut = 'Tab';


/**
 * A service providing code completion for editors.
 */
const service: JupyterLabPlugin<ICompletionManager> = {
  id: 'jupyter.services.completer',
  autoStart: true,
  provides: ICompletionManager,
  activate: (app: JupyterLab): ICompletionManager => {
    const { layout } = app.keymap;
    const handlers: { [id: string]: CompletionHandler } = {};
    const interrupt = (instance: any, event: KeyboardEvent): boolean => {
      return Keymap.keystrokeForKeydownEvent(event, layout) === shortcut;
    };

    app.commands.addCommand(CommandIDs.invoke, {
      execute: args => {
        let id = args['id'] as string;
        if (!id) {
          return;
        }

        const handler =handlers[id];
        if (!handler) {
          return;
        }

        if (handler.interrupter) {
          handler.interrupter.dispose();
        }
        handler.invoke();
      }
    });

    return {
      register: (completable: ICompletionManager.ICompletable): ICompletionManager.ICompletableAttributes => {
        const { anchor, editor, kernel, parent } = completable;
        const model = new CompleterModel();
        const completer = new CompleterWidget({ anchor, model });
        const handler = new CompletionHandler({ completer, interrupt, kernel });
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
      const cell = panel.console.prompt;
      const editor = cell && cell.editor;
      const kernel = panel.console.session.kernel;
      const parent = panel;
      const handler = manager.register({ anchor, editor, kernel, parent });

      // Listen for prompt creation.
      panel.console.promptCreated.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
      });

      // Listen for kernel changes.
      panel.console.session.kernelChanged.connect((sender, kernel) => {
        handler.kernel = kernel;
      });
    });

    // Add console completer command.
    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;
        return app.commands.execute(CommandIDs.invoke, { id });
      }
    });

    // Add console completer invocation key binding.
    app.keymap.addBinding({
      command: CommandIDs.invokeConsole,
      keys: [shortcut],
      selector: `.jp-ConsolePanel .${COMPLETABLE_CLASS}`
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

    // Add notebook completer invocation key binding.
    app.keymap.addBinding({
      command: CommandIDs.invokeNotebook,
      keys: [shortcut],
      selector: `.jp-Notebook .${COMPLETABLE_CLASS}`
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
