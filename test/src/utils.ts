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
function waitForDialog(host: HTMLElement = document.body): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let refresh = () => {
      let node = host.getElementsByClassName('jp-Dialog')[0];
      if (node) {
        resolve(void 0);
        return;
      }
      setTimeout(refresh, 10);
    }
    refresh();
  });
}


export
function acceptDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog().then(() => {
    let node = host.getElementsByClassName('jp-Dialog-okButton')[0];
    if (node) (node as HTMLElement).click();
  });
}


export
function dismissDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog().then(() => {
    let node = host.getElementsByClassName('jp-Dialog')[0];
    if (node) {
      triggerKeyEvent(node as HTMLElement, 'keydown', { keyCode: 27 });
    }
  });
}
