// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


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
  IInstanceRestorer
} from '../instancerestorer';

import {
import {
  InspectorManager
} from './manager';

import {
  CommandIDs, IInspector, Inspector
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
  requires: [ICommandPalette, IInstanceRestorer],
  provides: IInspector
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 */
    }
}


/**
 * Activate the console extension.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: IInstanceRestorer): IInspector {
  const category = 'Inspector';
  const command = CommandIDs.open;
  const label = 'Open Inspector';

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'inspector'
  });

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

  function openInspector(): void {
    if (!manager.inspector || manager.inspector.isDisposed) {
      manager.inspector = newInspector();
      app.shell.addToMainArea(manager.inspector);
    }
    if (manager.inspector.isAttached) {
      app.shell.activateMain(manager.inspector.id);
    }
  }

  app.commands.addCommand(command, { execute: openInspector, label });
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
