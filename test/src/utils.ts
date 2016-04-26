// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

export
function triggerMouseEvent(node: HTMLElement, eventType: string, options: any = {}) {
  let event = document.createEvent('MouseEvent');
  event.initMouseEvent(
    eventType, true, true, window, 0, 0, 0,
    options.clientX || 0, options.clientY || 0,
    options.ctrlKey || false, options.altKey || false,
    options.shiftKey || false, options.metaKey || false,
    options.button || 0, options.relatedTarget || null
  );
  node.dispatchEvent(event);
}

export
function triggerKeyEvent(node: HTMLElement, eventType: string, options: any = {}) {
  // cannot use KeyboardEvent in Chrome because it sets keyCode = 0
  let event = document.createEvent('Event');
  event.initEvent(eventType, true, true);
  for (let prop in options) {
    (<any>event)[prop] = options[prop];
  }
  node.dispatchEvent(event);
}
