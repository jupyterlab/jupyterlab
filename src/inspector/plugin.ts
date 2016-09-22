// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IInspector, Inspector
} from './';



/**
 * A service providing an inspector panel.
 */
export
const inspectorProvider: JupyterLabPlugin<IInspector> = {
  id: 'jupyter.services.inspector',
  provides: IInspector,
  requires: [ICommandPalette],
  activate: activateInspector
};


/**
 * Activate the console extension.
 */
function activateInspector(app: JupyterLab, palette: ICommandPalette): IInspector {
  let inspector = new Inspector({ items: Private.defaultInspectorItems });
  let openInspectorCommand = 'inspector:open';
  let opened = false;
  
  inspector.id = 'jp-inspector';
  inspector.title.label = 'Inspector';

  function openInspector(): void {
    if (!opened) {
      app.shell.addToMainArea(inspector);
      opened = true;
    } else {
      app.shell.activateMain(inspector.id);
    }
  }

  app.commands.addCommand(openInspectorCommand, {
    execute: openInspector,
    label: "Open Inspector"
  });

  palette.addItem({
    command: openInspectorCommand,
    category: 'Inspector'
  });

  return inspector;
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
    },
    {
      className: 'jp-DetailsInspectorItem',
      name: 'Details',
      rank: 10,
      remembers: true,
      type: 'details'
    }
  ];
}
