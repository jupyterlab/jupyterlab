// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  InstanceTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import {
  IInspector,
  InspectionHandler,
  InspectorPanel,
  KernelConnector
} from '@jupyterlab/inspector';

import { INotebookTracker } from '@jupyterlab/notebook';

/**
 * The command IDs used by the inspector plugin.
 */
namespace CommandIDs {
  export const open = 'inspector:open';
}

/**
 * A service providing code introspection.
 */
const inspector: JupyterLabPlugin<IInspector> = {
  id: '@jupyterlab/inspector-extension:inspector',
  requires: [ICommandPalette, ILayoutRestorer],
  provides: IInspector,
  autoStart: true,
  activate: (
    app: JupyterLab,
    palette: ICommandPalette,
    restorer: ILayoutRestorer
  ): IInspector => {
    const { commands, shell } = app;
    const category = 'Inspector';
    const command = CommandIDs.open;
    const label = 'Open Inspector';
    const namespace = 'inspector';
    const tracker = new InstanceTracker<MainAreaWidget<InspectorPanel>>({
      namespace
    });

    let source: IInspector.IInspectable | null = null;
    let inspector: MainAreaWidget<InspectorPanel>;
    function createInspector(): MainAreaWidget<InspectorPanel> {
      if (!inspector || inspector.isDisposed) {
        inspector = new MainAreaWidget({ content: new InspectorPanel() });
        inspector.content.source = source;
        inspector.id = 'jp-inspector';
        inspector.title.label = 'Inspector';
        tracker.add(inspector);
      }
      if (!inspector.isAttached) {
        shell.addToMainArea(inspector, { activate: false });
      }
      shell.activateById(inspector.id);
      return inspector;
    }

    // Add command to registry and palette.
    commands.addCommand(command, { label, execute: () => createInspector() });
    palette.addItem({ command, category });

    // Handle state restoration.
    restorer.restore(tracker, {
      command,
      args: () => null,
      name: () => 'inspector'
    });

    // Make `source` accessible via a getter to proxy the current inspector.
    return Object.defineProperty({}, 'source', {
      get: () =>
        !inspector || inspector.isDisposed ? null : inspector.content.source,
      set: src => {
        source = src;
        if (!inspector.isDisposed) {
          inspector.content.source = source;
        }
      }
    });
  }
};

/**
 * An extension that registers consoles for inspection.
 */
const consoles: JupyterLabPlugin<void> = {
  id: '@jupyterlab/inspector-extension:consoles',
  requires: [IInspector, IConsoleTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    manager: IInspector,
    consoles: IConsoleTracker
  ): void => {
    // Maintain association of new consoles with their respective handlers.
    const handlers: { [id: string]: InspectionHandler } = {};

    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, parent) => {
      const session = parent.console.session;
      const rendermime = parent.console.rendermime;
      const connector = new KernelConnector({ session });
      const handler = new InspectionHandler({ connector, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

      // Set the initial editor.
      let cell = parent.console.promptCell;
      handler.editor = cell && cell.editor;

      // Listen for prompt creation.
      parent.console.promptCellCreated.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
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

    app.contextMenu.addItem({
      command: CommandIDs.open,
      selector: '.jp-CodeConsole-promptCell'
    });
  }
};

/**
 * An extension that registers notebooks for inspection.
 */
const notebooks: JupyterLabPlugin<void> = {
  id: '@jupyterlab/inspector-extension:notebooks',
  requires: [IInspector, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    manager: IInspector,
    notebooks: INotebookTracker
  ): void => {
    // Maintain association of new notebooks with their respective handlers.
    const handlers: { [id: string]: InspectionHandler } = {};

    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, parent) => {
      const session = parent.session;
      const rendermime = parent.rendermime;
      const connector = new KernelConnector({ session });
      const handler = new InspectionHandler({ connector, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

      // Set the initial editor.
      let cell = parent.content.activeCell;
      handler.editor = cell && cell.editor;

      // Listen for active cell changes.
      parent.content.activeCellChanged.connect((sender, cell) => {
        handler.editor = cell && cell.editor;
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

    app.contextMenu.addItem({
      command: CommandIDs.open,
      selector: '.jp-Notebook'
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [inspector, consoles, notebooks];
export default plugins;
