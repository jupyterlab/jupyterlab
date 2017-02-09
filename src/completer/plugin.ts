// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

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
  CompleterModel, CompleterWidget, CompletionHandler
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
 * An extension that registers consoles for code completion.
 */
const consolePlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.console-completer',
  requires: [IConsoleTracker],
  autoStart: true,
  activate: (app: JupyterLab, consoles: IConsoleTracker): void => {
    const { layout } = app.keymap;
    const interrupt = (instance: any, event: KeyboardEvent): boolean => {
      return Keymap.keystrokeForKeydownEvent(event, layout) === shortcut;
    };

    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, parent) => {
      app.commands.execute(CommandIDs.consoleAttach, { id: parent.id });
    });

    app.commands.addCommand(CommandIDs.consoleAttach, {
      execute: args => {
        const id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const parent = consoles.getWidgetById(id);
        if (!parent) {
          return;
        }

        const session = parent.console.session;
        const kernel = session.kernel;
        const model = new CompleterModel();
        const anchor = parent.console;
        const completer = new CompleterWidget({ anchor, model });
        const handler = new CompletionHandler({ completer, interrupt, kernel });

        // Associate the handler with the parent widget.
        Private.handlers.set(parent, handler);

        // Set the initial editor.
        let cell = parent.console.prompt;
        handler.editor = cell && cell.editor;

        // Listen for prompt creation.
        parent.console.promptCreated.connect((sender, cell) => {
          handler.editor = cell && cell.editor;
        });

        // Listen for kernel changes.
        session.kernelChanged.connect((sender, kernel) => {
          handler.kernel = kernel;
        });

        // Attach the completer widget.
        Widget.attach(completer, document.body);

        // Listen for parent disposal.
        parent.disposed.connect(() => {
          model.dispose();
          completer.dispose();
          handler.dispose();
        });
      }
    });

    app.commands.addCommand(CommandIDs.consoleInvoke, {
      execute: () => {
        const widget = consoles.currentWidget;
        if (!widget) {
          return;
        }

        const handler = Private.handlers.get(widget);
        if (!handler) {
          return;
        }

        if (handler.interrupter) {
          handler.interrupter.dispose();
        }

        handler.invoke();
      }
    });

    app.keymap.addBinding({
      command: CommandIDs.consoleInvoke,
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
  requires: [INotebookTracker],
  autoStart: true,
  activate: (app: JupyterLab, notebooks: INotebookTracker): void => {
    const { layout } = app.keymap;
    const interrupt = (instance: any, event: KeyboardEvent): boolean => {
      return Keymap.keystrokeForKeydownEvent(event, layout) === shortcut;
    };

    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, parent) => {
      app.commands.execute(CommandIDs.notebookAttach, { id: parent.id });
    });

    app.commands.addCommand(CommandIDs.notebookAttach, {
      execute: args => {
        const id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const parent = notebooks.getWidgetById(id);
        if (!parent) {
          return;
        }

        const kernel = parent.kernel;
        const model = new CompleterModel();
        const anchor = parent.notebook;
        const completer = new CompleterWidget({ anchor, model });
        const handler = new CompletionHandler({ completer, interrupt, kernel });

        // Associate the handler with the parent widget.
        Private.handlers.set(parent, handler);

        // Set the initial editor.
        let cell = parent.notebook.activeCell;
        handler.editor = cell && cell.editor;

        // Listen for active cell changes.
        parent.notebook.activeCellChanged.connect((sender, cell) => {
          handler.editor = cell && cell.editor;
        });

        // Listen for kernel changes.
        parent.kernelChanged.connect((sender, kernel) => {
          handler.kernel = kernel;
        });

        // Attach the completer widget.
        Widget.attach(completer, document.body);

        // Listen for parent disposal.
        parent.disposed.connect(() => {
          model.dispose();
          completer.dispose();
          handler.dispose();
        });
      }
    });

    app.commands.addCommand(CommandIDs.notebookInvoke, {
      execute: () => {
        const widget = notebooks.currentWidget;
        if (!widget) {
          return;
        }

        const handler = Private.handlers.get(widget);
        if (!handler) {
          return;
        }

        if (handler.interrupter) {
          handler.interrupter.dispose();
        }

        handler.invoke();
      }
    });

    app.keymap.addBinding({
      command: CommandIDs.notebookInvoke,
      keys: [shortcut],
      selector: `.jp-Notebook .${COMPLETABLE_CLASS}`
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [consolePlugin, notebookPlugin];
export default plugins;


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A property that associates completion handlers with their referent widgets.
   */
  export
  const handlers = new AttachedProperty<Widget, CompletionHandler>({
    name: 'handler'
  });
}
