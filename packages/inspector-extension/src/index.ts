// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

// FIXME: Not sure how to handle restore of this side panel
// import { InstanceTracker } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  IInspector,
  InspectionHandler,
  InspectorPanel,
  KernelConnector,
  InfoHandler,
  KernelInfoHandler
} from '@jupyterlab/inspector';

import { INotebookTracker } from '@jupyterlab/notebook';

import { InspectorManager } from './manager';

import { KernelMessage } from '@jupyterlab/services';

/**
 * A service providing code introspection.
 */
const inspector: JupyterLabPlugin<IInspector> = {
  id: '@jupyterlab/inspector-extension:inspector',
  requires: [ILayoutRestorer],
  provides: IInspector,
  autoStart: true,
  activate: (app: JupyterLab, restorer: ILayoutRestorer): IInspector => {
    const { shell } = app;
    const manager = new InspectorManager();
    // const namespace = 'inspector';
    // const tracker = new InstanceTracker<MainAreaWidget<InspectorPanel>>({
    //     namespace
    // });
    /**
     * Create and track a new inspector.
     */
    if (!manager.inspector || manager.inspector.isDisposed) {
      const inspector = new InspectorPanel();

      inspector.id = 'jp-inspector';
      inspector.title.label = 'Inspector';
      inspector.disposed.connect(() => {
        if (manager.inspector === inspector) {
          manager.inspector = null;
        }
      });

      // Add the default inspector child items.
      Private.defaultInspectorItems.forEach(item => {
        inspector.add(item);
      });

      manager.inspector = inspector;

      if (!manager.inspector.isAttached) {
        shell.addToLeftArea(manager.inspector, { rank: 300 });
      }
    }

    if (manager.inspector.isAttached) {
      shell.activateById(manager.inspector.id);
    }

    // Handle state restoration.
    // restorer.restore(tracker, {
    //   command,
    //   args: () => null,
    //   name: () => 'inspector'
    // });

    return manager;
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
  }
};

/**
 * An extension that allows notebooks to display transient_display_data
 * message in tabs of the inspection panel.
 */
const infopanels: JupyterLabPlugin<void> = {
  id: '@jupyterlab/inspector-extension:infopanels',
  requires: [IInspector, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    inspector: IInspector,
    notebooks: INotebookTracker
  ): void => {
    // Maintain association of new notebooks with their respective handlers.
    const handlers: { [id: string]: KernelInfoHandler } = {};

    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, parent) => {
      const session = parent.session;
      const handler = new KernelInfoHandler({ inspector, session });

      // Associate the handler to the widget.
      handlers[parent.id] = handler;

      // Listen for parent disposal.
      parent.disposed.connect(() => {
        delete handlers[parent.id];
        handler.dispose();
      });
    });

    // Unlike notebook widget, even inactive kernels could send
    // transient message so there is no need to switch sources
  }
};

/**
 * The command IDs used by the inspector plugin.
 */
namespace CommandIDs {
  export const display = 'inspector:test_transient_message';
}
/**
 * An extension that allows notebooks to display transient_display_data
 * message in tabs of the inspection panel.
 */
const testpanels: JupyterLabPlugin<void> = {
  id: '@jupyterlab/inspector-extension:testpanels',
  requires: [ICommandPalette, IInspector, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    palette: ICommandPalette,
    inspector: IInspector,
    notebooks: INotebookTracker
  ): void => {
    const { commands } = app;

    const handler = new InfoHandler({ inspector });

    const category = 'Inspector';
    const command = CommandIDs.display;
    const label = 'Send as transient_display_data';

    commands.addCommand(command, {
      label,
      execute: () => {
        // get the current notebook and cell
        let widget = notebooks.currentWidget;
        if (!widget) return;
        let cell = widget.content.activeCell;
        if (!cell) return;
        let content = cell.model.value.text;
        let transient_msg = KernelMessage.createMessage(
          {
            msgType: 'transient_display_data',
            channel: 'iopub',
            session: 'whatever'
          },
          eval('(' + content + ')')
        );
        handler.displayTransientMessage(
          transient_msg as KernelMessage.ITransientDisplayDataMsg
        );
      }
    });
    palette.addItem({ command, category });
    app.contextMenu.addItem({
      command: CommandIDs.display,
      selector: '.jp-Notebook .jp-Cell'
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  inspector,
  consoles,
  notebooks,
  infopanels,
  testpanels
];
export default plugins;

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The default set of inspector items added to the inspector panel.
   */
  export const defaultInspectorItems: IInspector.IInspectorItem[] = [
    {
      className: 'jp-HintsInspectorItem',
      name: 'Hints',
      rank: 20,
      type: 'hints'
    }
  ];
}
