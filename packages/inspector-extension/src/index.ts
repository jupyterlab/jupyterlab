// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
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

import { ILauncher } from '@jupyterlab/launcher';

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
const inspector: JupyterFrontEndPlugin<IInspector> = {
  id: '@jupyterlab/inspector-extension:inspector',
  optional: [ICommandPalette, ILauncher, ILayoutRestorer],
  provides: IInspector,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette | null,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null
  ): IInspector => {
    const { commands, shell } = app;
    const command = CommandIDs.open;
    const label = 'Open Inspector';
    const title = 'Inspector';
    const namespace = 'inspector';
    const tracker = new InstanceTracker<MainAreaWidget<InspectorPanel>>({
      namespace
    });

    let source: IInspector.IInspectable | null = null;
    let inspector: MainAreaWidget<InspectorPanel>;
    function openInspector(): MainAreaWidget<InspectorPanel> {
      if (!inspector || inspector.isDisposed) {
        inspector = new MainAreaWidget({ content: new InspectorPanel() });
        inspector.id = 'jp-inspector';
        inspector.title.label = title;
        void tracker.add(inspector);
        source = source && !source.isDisposed ? source : null;
        inspector.content.source = source;
      }
      if (!inspector.isAttached) {
        shell.add(inspector, 'main', { activate: false });
      }
      shell.activateById(inspector.id);
      return inspector;
    }

    // Add command to registry.
    commands.addCommand(command, {
      caption: 'Live updating code documentation from the active kernel',
      isEnabled: () =>
        !inspector ||
        inspector.isDisposed ||
        !inspector.isAttached ||
        !inspector.isVisible,
      label: args => (args.isLauncher ? title : label),
      iconClass: args =>
        args.isLauncher ? 'jp-MaterialIcon jp-InspectorIcon' : '',
      execute: () => openInspector()
    });

    // Add command to UI where possible.
    if (palette) {
      palette.addItem({ command, category: title });
    }
    if (launcher) {
      launcher.add({ command, args: { isLauncher: true } });
    }

    // Handle state restoration.
    if (restorer) {
      restorer.restore(tracker, {
        command,
        args: () => null,
        name: () => 'inspector'
      });
    }

    // Create a proxy to pass the `source` to the current inspector.
    const proxy: IInspector = Object.defineProperty({}, 'source', {
      get: (): IInspector.IInspectable | null =>
        !inspector || inspector.isDisposed ? null : inspector.content.source,
      set: (src: IInspector.IInspectable | null) => {
        source = src && !src.isDisposed ? src : null;
        if (inspector && !inspector.isDisposed) {
          inspector.content.source = source;
        }
      }
    });

    return proxy;
  }
};

/**
 * An extension that registers consoles for inspection.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/inspector-extension:consoles',
  requires: [IInspector, IConsoleTracker, ILabShell],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IInspector,
    consoles: IConsoleTracker,
    labShell: ILabShell
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
    labShell.currentChanged.connect((_, args) => {
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
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/inspector-extension:notebooks',
  requires: [IInspector, INotebookTracker, ILabShell],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IInspector,
    notebooks: INotebookTracker,
    labShell: ILabShell
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
    labShell.currentChanged.connect((sender, args) => {
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
const plugins: JupyterFrontEndPlugin<any>[] = [inspector, consoles, notebooks];
export default plugins;
