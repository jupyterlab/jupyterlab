// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { Widget } from '@phosphor/widgets';
/*
 * A widget used to open a path based on user input.
 */
class OpenPathWidget extends Widget {
  /**
   * Construct a new open path widget.
   */
  constructor() {
    super({ node: Private.createOpenPathNode() });
  }

  /**
   * Get the value of the widget.
   */
  getValue(): string {
    return this.inputNode.value;
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  }
}

/**
 * Create the node for the open path handler.
 */
export async function askUserForPath(
  contentsManager: any
): Promise<string | undefined> {
  const result = await showDialog({
    title: 'Open Path',
    body: new OpenPathWidget(),
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'OPEN' })],
    focusNodeSelector: 'input'
  });
  if (result.button.label === 'OPEN') {
    return result.value;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for an open path widget.
   */
  export function createOpenPathNode(): HTMLElement {
    let body = document.createElement('div');
    let existingLabel = document.createElement('label');
    existingLabel.textContent = 'Path:';

    let input = document.createElement('input');
    input.value = '';
    input.placeholder = '/path/relative/to/jlab/root';

    body.appendChild(existingLabel);
    body.appendChild(input);
    return body;
  }
}
