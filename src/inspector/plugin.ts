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
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';

import {
  IInspector, Inspector
} from './';


/**
 * A service providing an inspector panel.
 */
export
const plugin: JupyterLabPlugin<IInspector> = {
  id: 'jupyter.services.inspector',
  requires: [ICommandPalette, IStateDB, ILayoutRestorer],
  provides: IInspector,
  activate: activateInspector
};


/**
 * A class that manages inspector widget instances and offers persistent
 * `IInspector` instance that other plugins can communicate with.
 */
class InspectorManager implements IInspector {
  /**
   * The current inspector widget.
   */
  get inspector(): Inspector {
    return this._inspector;
  }
  set inspector(inspector: Inspector) {
    if (this._inspector === inspector) {
      return;
    }
    this._inspector = inspector;
    // If an inspector was added and it has no source
    if (inspector && !inspector.source) {
      inspector.source = this._source;
    }
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): Inspector.IInspectable {
    return this._source;
  }
  set source(source: Inspector.IInspectable) {
    if (this._source !== source) {
      if (this._source) {
        this._source.disposed.disconnect(this._onSourceDisposed, this);
      }
      this._source = source;
      this._source.disposed.connect(this._onSourceDisposed, this);
    }
    if (this._inspector && !this._inspector.isDisposed) {
      this._inspector.source = this._source;
    }
  }

  /**
   * Handle the source disposed signal.
   */
  private _onSourceDisposed() {
    this._source = null;
  }

  private _inspector: Inspector = null;
  private _source: Inspector.IInspectable = null;
}


/**
 * Activate the console extension.
 */
function activateInspector(app: JupyterLab, palette: ICommandPalette, state: IStateDB, layout: ILayoutRestorer): IInspector {
  const category = 'Inspector';
  const command = 'inspector:open';
  const label = 'Open Inspector';
  const manager = new InspectorManager();
  const tracker = new InstanceTracker<Inspector>();

  // Handle state restoration.
  layout.restore(tracker, {
    namespace: 'inspector',
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
