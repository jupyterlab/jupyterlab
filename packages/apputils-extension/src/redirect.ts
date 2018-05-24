/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Widget
} from '@phosphor/widgets';


const LABEL = `Please enter a workspace name to prevent your session
  from colliding with an open JupyterLab window.`;


export
class RedirectForm extends Widget {
  constructor() {
    super({ node: Private.createNode() });
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Create the redirect form's content.
   */
  export
  function createNode(): HTMLElement {
    const root = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createTextNode(LABEL);

    label.appendChild(text);
    label.appendChild(input);
    root.appendChild(label);

    return root;
  }
}
