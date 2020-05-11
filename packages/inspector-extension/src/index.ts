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
  MainAreaWidget,
  WidgetTracker
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

import { inspectorIcon } from '@jupyterlab/ui-components';

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
    const label = 'Show Contextual Help';
    const namespace = 'inspector';
    const tracker = new WidgetTracker<MainAreaWidget<InspectorPanel>>({
      namespace
    });

    let source: IInspector.IInspectable | null = null;
    let inspector: MainAreaWidget<InspectorPanel>;
    function openInspector(): MainAreaWidget<InspectorPanel> {
      if (!inspector || inspector.isDisposed) {
        inspector = new MainAreaWidget({ content: new InspectorPanel() });
        inspector.id = 'jp-inspector';
        inspector.title.label = label;
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
      label,
      icon: args => (args.isLauncher ? inspectorIcon : undefined),
      execute: () => openInspector()
    });

    // Add command to UI where possible.
    if (palette) {
      palette.addItem({ command, category: label });
    }
    if (launcher) {
      launcher.add({ command, args: { isLauncher: true } });
    }

    // Handle state restoration.
    if (restorer) {
      void restorer.restore(tracker, { command, name: () => 'inspector' });
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
      const sessionContext = parent.console.sessionContext;
      const rendermime = parent.console.rendermime;
      const connector = new KernelConnector({ sessionContext });
      const handler = new InspectionHandler({ connector, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

      // Set the initial editor.
      const cell = parent.console.promptCell;
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
      const widget = args.newValue;
      if (!widget || !consoles.has(widget)) {
        return;
      }
      const source = handlers[widget.id];
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
      const sessionContext = parent.sessionContext;
      const rendermime = parent.content.rendermime;
      const connector = new KernelConnector({ sessionContext });
      const handler = new InspectionHandler({ connector, rendermime });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

      // Set the initial editor.
      const cell = parent.content.activeCell;
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
      const widget = args.newValue;
      if (!widget || !notebooks.has(widget)) {
        return;
      }
      const source = handlers[widget.id];
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
