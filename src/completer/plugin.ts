// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  CompleterModel, CompleterWidget, CompletionHandler
} from './';


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
      const session = parent.console.session;
      const kernel = session.kernel;
      const model = new CompleterModel();
      const completer = new CompleterWidget({ anchor: parent.console, model });
      const handler = new CompletionHandler({ completer, kernel });

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
      const kernel = parent.kernel;
      const model = new CompleterModel();
      const completer = new CompleterWidget({ anchor: parent.notebook, model });
      const handler = new CompletionHandler({ completer, kernel });

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
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [consolePlugin, notebookPlugin];
export default plugins;
