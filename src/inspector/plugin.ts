// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Inspector
} from './';


/**
 * The code inspector extension.
 */
export
const inspectorExtension = {
  id: 'jupyter.extensions.inspector',
  activate: activateInspector
};


/**
 * A service providing an interface to the code inspector.
 */
export
const inspectorProvider = {
  id: 'jupyter.services.inspector',
  provides: Inspector,
  resolve: () => { return Private.inspector; }
};


/**
 * Activate the console extension.
 */
function activateInspector(app: Application): Promise<void> {
  let inspector = Private.inspector;
  inspector.id = 'jp-inspector';
  inspector.title.text = 'Inspector';
  // Rank has been chosen somewhat arbitrarily to guarantee the inspector is
  // at least not the first item in the application sidebar.
  app.shell.addToRightArea(inspector, { rank: 3 });
  return Promise.resolve(void 0);
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The default set of inspector items added to the inspector panel.
   */
  const defaultInspectorItems: Inspector.IInspectorItem[] = [
    {
      className: 'jp-HintsInspectorItem',
      name: 'Hints',
      rank: 2,
      type: 'hints'
    },
    {
      className: 'jp-DetailsInspectorItem',
      name: 'Details',
      rank: 1,
      remembers: true,
      type: 'details'
    }
  ];

  /**
   * The default singleton instance of the code inspector.
   */
  export
  const inspector = new Inspector({ items: defaultInspectorItems });
}
