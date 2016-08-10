// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

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
  activate: activateInspector
};


/**
 * Activate the console extension.
 */
function activateInspector(app: JupyterLab): IInspector {
  let inspector = new Inspector({ items: Private.defaultInspectorItems });
  inspector.id = 'jp-inspector';
  inspector.title.label = 'Inspector';

  // Rank has been chosen somewhat arbitrarily to guarantee the inspector is
  // at least not the first item in the application sidebar.
  app.shell.addToRightArea(inspector, { rank: 20 });

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
