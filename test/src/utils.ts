// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';


export
function triggerMouseEvent(node: HTMLElement, eventType: string, options: any = {}) {
  let evt = new MouseEvent(eventType, options);
  node.dispatchEvent(evt);
}


export
function triggerKeyEvent(node: HTMLElement, eventType: string, options: any = {}) {
  let evt = new KeyboardEvent(eventType, options);
  // Work around bug in Chrome that zeros out the keyCode.
  if ('keyCode' in options) {
    Object.defineProperty(evt, 'keyCode', { value: options['keyCode'] });
  }
  node.dispatchEvent(evt);
}


export
function acceptDialog(host: HTMLElement = document.body): Promise<void> {
  return Promise.resolve().then(() => {
    let node = host.getElementsByClassName('jp-Dialog-okButton')[0];
    (node as HTMLElement).click();
  });
}
