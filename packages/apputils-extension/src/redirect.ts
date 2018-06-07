/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Widget
} from '@phosphor/widgets';


/**
 * The form label.
 */
const LABEL = `This workspace is already in use in another JupyterLab window.
  Please enter another workspace name.`;

/**
 * The form input field placeholder.
 */
const PLACEHOLDER = 'url-friendly-workspace-name';

/**
 * The form warning message if an empty value was submitted.
 */
const WARNING = 'Please enter a value.';


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

  /**
   * The warning message.
   */
  get warning(): string {
    return this.node.querySelector('.jp-RedirectForm-warning').textContent;
  }
  set warning(warning: string) {
    this.node.querySelector('.jp-RedirectForm-warning').textContent = warning;
  }

  /**
   * Returns the input value.
   */
  getValue(): string {
    return encodeURIComponent(this.node.querySelector('input').value);
  }
}


/**
 * Return a new redirect form, populated with default language.
 */
export
function createRedirectForm(warn = false): RedirectForm {
  const form = new RedirectForm();

  form.label = LABEL;
  form.placeholder = PLACEHOLDER;
  form.warning = warn ? WARNING : '';

  return form;
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
    const node = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');
    const warning = document.createElement('div');

    node.className = 'jp-RedirectForm';
    warning.className = 'jp-RedirectForm-warning';

    label.appendChild(text);
    label.appendChild(input);
    node.appendChild(label);
    node.appendChild(warning);

    return node;
  }
}
