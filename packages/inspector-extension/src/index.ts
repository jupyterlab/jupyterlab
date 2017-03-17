// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  IConsoleTracker
} from '@jupyterlab/console';

import {
  IInspector, InspectorPanel, InspectionHandler
} from '@jupyterlab/inspector';

import {
  INotebookTracker
} from '@jupyterlab/notebook';

import {
  InspectorManager
} from './manager';


/**
 * The command IDs used by the inspector plugin.
 */
namespace CommandIDs {
  export
  const open = 'inspector:open';
};


/**
 * A service providing code introspection.
 */
const service: JupyterLabPlugin<IInspector> = {
  id: 'jupyter.services.inspector',
  requires: [ICommandPalette, ILayoutRestorer],
  provides: IInspector,
  autoStart: true,
  activate: (app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): IInspector => {
    const { commands, shell } = app;
    const manager = new InspectorManager();
    const category = 'Inspector';
    const command = CommandIDs.open;
    const label = 'Open Inspector';
    const tracker = new InstanceTracker<InspectorPanel>({
      namespace: 'inspector',
      shell
    });

    /**
     * Create and track a new inspector.
     */
    function newInspectorPanel(): InspectorPanel {
      const inspector = new InspectorPanel();

      inspector.id = 'jp-inspector';
      inspector.title.label = 'Inspector';
      inspector.title.closable = true;
      inspector.disposed.connect(() => {
        if (manager.inspector === inspector) {
          manager.inspector = null;
        }
      });

      // Track the inspector.
      tracker.add(inspector);

      // Add the default inspector child items.
      Private.defaultInspectorItems.forEach(item => { inspector.add(item); });

      return inspector;
    }

    // Handle state restoration.
    restorer.restore(tracker, {
      command,
      args: () => null,
      name: () => 'inspector'
    });

    // Add command to registry and palette.
    commands.addCommand(command, {
      label,
      execute: () => {
        if (!manager.inspector || manager.inspector.isDisposed) {
          manager.inspector = newInspectorPanel();
          shell.addToMainArea(manager.inspector);
        }
        if (manager.inspector.isAttached) {
          tracker.activate(manager.inspector);
        }
      }
    });
    palette.addItem({ command, category });

    return manager;
  }
};

/**
 * An extension that registers consoles for inspection.
 */
const consolePlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.console-inspector',
  requires: [IInspector, IConsoleTracker],
  autoStart: true,
  activate: (app: JupyterLab, manager: IInspector, consoles: IConsoleTracker): void => {
    // Maintain association of new consoles with their respective handlers.
    const handlers: { [id: string]: InspectionHandler } = {};

    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, parent) => {
      const session = parent.console.session;
      const kernel = session.kernel;
      const rendermime = parent.console.rendermime;
      const handler = new InspectionHandler({ kernel, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

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

      // Listen for parent disposal.
      parent.disposed.connect(() => {
        delete handlers[parent.id];
        handler.dispose();
      });
    });

    // Keep track of console instances and set inspector source.
    app.shell.currentChanged.connect((sender, args) => {
      let widget = args.newValue;
      if (!widget || !consoles.has(widget)) {
        return;
      }
      let source = handlers[widget.id];
      if (source) {
        manager.source = source;
      }
    });
  }
};

/**
 * An extension that registers notebooks for inspection.
 */
const notebookPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.notebook-inspector',
  requires: [IInspector, INotebookTracker],
  autoStart: true,
  activate: (app: JupyterLab, manager: IInspector, notebooks: INotebookTracker): void => {
    // Maintain association of new notebooks with their respective handlers.
    const handlers: { [id: string]: InspectionHandler } = {};

    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, parent) => {
      const kernel = parent.kernel;
      const rendermime = parent.rendermime;
      const handler = new InspectionHandler({ kernel, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

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

      // Listen for parent disposal.
      parent.disposed.connect(() => {
        delete handlers[parent.id];
        handler.dispose();
      });
    });

    // Keep track of notebook instances and set inspector source.
    app.shell.currentChanged.connect((sender, args) => {
      let widget = args.newValue;
      if (!widget || !notebooks.has(widget)) {
        return;
      }
      let source = handlers[widget.id];
      if (source) {
        manager.source = source;
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


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The default set of inspector items added to the inspector panel.
   */
  export
  const defaultInspectorItems: IInspector.IInspectorItem[] = [
    {
      className: 'jp-HintsInspectorItem',
      name: 'Hints',
      rank: 20,
      type: 'hints'
    }
  ];
}
