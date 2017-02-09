// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, Session
} from '@jupyterlab/services';

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
  ConsolePanel, IConsoleTracker
} from '../console';

import {
  INotebookTracker, NotebookPanel
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
 * Initialize a parent console panel's completion handler.
 */
function initConsoleHandler(panel: ConsolePanel, handler: CompletionHandler) {
  // Set the initial editor.
  let cell = panel.console.prompt;
  handler.editor = cell && cell.editor;
  // Listen for prompt creation.
  panel.console.promptCreated.connect((sender, cell) => {
    handler.editor = cell && cell.editor;
  });
  // Listen for kernel changes.
  panel.console.session.kernelChanged.connect((sender, kernel) => {
    handler.kernel = kernel;
  });
}

/**
 * Initialize a parent notebook panel's completion handler.
 */
function initNotebookHandler(panel: NotebookPanel, handler: CompletionHandler) {
  // Set the initial editor.
  let cell = panel.notebook.activeCell;
  handler.editor = cell && cell.editor;
  // Listen for active cell changes.
  panel.notebook.activeCellChanged.connect((sender, cell) => {
    handler.editor = cell && cell.editor;
  });
  // Listen for kernel changes.
  panel.kernelChanged.connect((sender, kernel) => { handler.kernel = kernel; });
}


/**
 * An extension that registers consoles for code completion.
 */
const core: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.completer',
  requires: [IConsoleTracker, INotebookTracker],
  autoStart: true,
  activate: (app: JupyterLab, consoles: IConsoleTracker, notebooks: INotebookTracker): void => {
    const { layout } = app.keymap;
    const interrupt = (instance: any, event: KeyboardEvent): boolean => {
      return Keymap.keystrokeForKeydownEvent(event, layout) === shortcut;
    };

    app.commands.addCommand(CommandIDs.attach, {
      execute: args => {
        const notebook = !!(args && args['notebook']);
        const id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        let kernel: Kernel.IKernel | null = null;
        let anchor: Widget;
        let parent = notebook ? notebooks.getWidgetById(id)
          : consoles.getWidgetById(id);
        if (!parent) {
          return;
        }

        if (notebook) {
          kernel = (parent as NotebookPanel).kernel;
          anchor = (parent as NotebookPanel).notebook;
        } else {
          kernel = (parent as ConsolePanel).console.session.kernel;
          anchor = (parent as ConsolePanel).console;
        }

        const model = new CompleterModel();
        const completer = new CompleterWidget({ anchor, model });
        const handler = new CompletionHandler({ completer, interrupt, kernel });

        // Associate the handler with the parent widget.
        Private.handlers.set(parent, handler);

        if (notebook) {
          initNotebookHandler(parent as NotebookPanel, handler);
        } else {
          initConsoleHandler(parent as ConsolePanel, handler);
        }

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

    app.commands.addCommand(CommandIDs.invoke, {
      execute: args => {
        const notebook = !!(args && args['notebook']);
        const widget = notebook ? notebooks.currentWidget
          : consoles.currentWidget;
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
  }
};


/**
 * An extension that registers consoles for code completion.
 */
const consolePlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.console-completer',
  requires: [IConsoleTracker],
  autoStart: true,
  activate: (app: JupyterLab, consoles: IConsoleTracker): void => {
    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, parent) => {
      const args = { id: parent.id, notebook: false };
      app.commands.execute(CommandIDs.attach, args);
    });

    // Add console completer invocation key binding.
    app.keymap.addBinding({
      command: CommandIDs.invoke,
      args: { notebook: false },
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
    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, parent) => {
      const args = { id: parent.id, notebook: true };
      app.commands.execute(CommandIDs.attach, args);
    });

    // Add notebook completer invocation key binding.
    app.keymap.addBinding({
      command: CommandIDs.invoke,
      args: { notebook: true },
      keys: [shortcut],
      selector: `.jp-Notebook .${COMPLETABLE_CLASS}`
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [core, consolePlugin, notebookPlugin];
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
