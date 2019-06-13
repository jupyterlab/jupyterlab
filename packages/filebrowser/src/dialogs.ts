// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { Widget } from '@phosphor/widgets';
/*
 * A widget used to open a file directly.
 */
class OpenDirectWidget extends Widget {
  /**
   * Construct a new open file widget.
   */
  constructor() {
    super({ node: Private.createOpenNode() });
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
 * Create the node for the open handler.
 */
export function getOpenPath(contentsManager: any): Promise<string | undefined> {
  return showDialog({
    title: 'Open File or Directory',
    body: new OpenDirectWidget(),
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'OPEN' })],
    focusNodeSelector: 'input'
  }).then((result: any) => {
    if (result.button.label === 'OPEN') {
      return result.value;
    }
    return;
  });
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for a open widget.
   */
  export function createOpenNode(): HTMLElement {
    let body = document.createElement('div');
    let existingLabel = document.createElement('label');
    existingLabel.textContent = 'Enter Path:';

    let input = document.createElement('input');
    input.value = '';
    input.placeholder = '/path/from/launch/directory';

    body.appendChild(existingLabel);
    body.appendChild(input);
    return body;
  }
}
