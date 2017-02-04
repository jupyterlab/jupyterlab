// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IConsoleTracker, ConsolePanel
} from '../console';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  INotebookTracker, NotebookPanel
} from '../notebook';

import {
  InspectorManager
} from './manager';

import {
  CommandIDs, IInspector, Inspector, InspectionHandler
} from './';


/**
 * The inspector manager instance.
 */
const manager = new InspectorManager();

/**
 * The inspector instance tracker.
 */
const tracker = new InstanceTracker<Inspector>({ namespace: 'inspector' });

/**
 * A service providing an inspector panel.
 */
const plugin: JupyterLabPlugin<IInspector> = {
  activate,
  id: 'jupyter.services.inspector',
  requires: [
    ICommandPalette, IInstanceRestorer, IConsoleTracker, INotebookTracker
  ],
  provides: IInspector,
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Create and track a new inspector.
 */
function newInspector(): Inspector {
  let inspector = new Inspector({ items: Private.defaultInspectorItems });
  inspector.id = 'jp-inspector';
  inspector.title.label = 'Inspector';
  inspector.title.closable = true;
  inspector.disposed.connect(() => {
    if (manager.inspector === inspector) {
      manager.inspector = null;
    }
  });
  tracker.add(inspector);
  return inspector;
}


/**
 * Activate the console extension.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: IInstanceRestorer, consoles: IConsoleTracker, notebooks: INotebookTracker): IInspector {
  const category = 'Inspector';
  const command = CommandIDs.open;
  const label = 'Open Inspector';

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'inspector'
  });

  // Keep track of console and notebook instances and set inspector source.
  app.shell.currentChanged.connect((sender, args) => {
    if (!args.newValue) {
      return;
    }
    if (notebooks.has(args.newValue)) {
      let widget = args.newValue as NotebookPanel;
      manager.source = widget.inspectionHandler;
    }
  });

  // Create a handler for each console that is created.
  consoles.widgetAdded.connect((sender, parent) => {
    const session = parent.console.session;
    const kernel = session.kernel;
    const rendermime = parent.console.rendermime;
    const handler = new InspectionHandler({ kernel, parent, rendermime });
    // Listen for kernel changes.
    session.kernelChanged.connect((sender, kernel) => {
      handler.kernel = kernel;
    });
  });

  // Add command to registry and palette.
  app.commands.addCommand(command, {
    label,
    execute: () => {
      if (!manager.inspector || manager.inspector.isDisposed) {
        manager.inspector = newInspector();
        app.shell.addToMainArea(manager.inspector);
      }
      if (manager.inspector.isAttached) {
        app.shell.activateMain(manager.inspector.id);
      }
    }
  });
  palette.addItem({ command, category });

  return manager;
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The default set of inspector items added to the inspector panel.
   */
  export
  const defaultInspectorItems: Inspector.IInspectorItem[] = [
    {
      className: 'jp-HintsInspectorItem',
      name: 'Hints',
      rank: 20,
      type: 'hints'
    }
  ];
}
