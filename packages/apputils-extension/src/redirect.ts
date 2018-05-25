/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Widget
} from '@phosphor/widgets';


/**
 * The UI for the recovery option to redirect to a different workspace.
 */
export
class RedirectForm extends Widget {
  /**
   * Create a redirect form.
   */
  constructor() {
    super({ node: Private.createNode() });
    this.addClass('jp-RedirectForm');
  }

  /**
   * The text label of the form.
   */
  get label(): string {
    return this.node.querySelector('label span').textContent;
  }
  set label(label: string) {
    this.node.querySelector('label span').textContent = label;
  }

  /**
   * The input placeholder.
   */
  get placeholder(): string {
    return this.node.querySelector('input').placeholder;
  }
  set placeholder(placeholder: string) {
    this.node.querySelector('input').placeholder = placeholder;
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
    const text = document.createElement('span');

    label.appendChild(text);
    label.appendChild(input);
    root.appendChild(label);

    return root;
  }
}
