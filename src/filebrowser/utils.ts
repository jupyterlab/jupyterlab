// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  okButton, showDialog
} from 'jupyter-js-domutils';

import {
  hitTest
} from 'phosphor-domutil';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to FileBrowser instances.
 */
export
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

/**
 * The class name added to drop targets.
 */
export
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * The class name added to selected rows.
 */
export
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The mime type for a contents drag object.
 */
export
const CONTENTS_MIME = 'application/x-jupyter-icontents';


/**
 * An error message dialog to show in the filebrowser widget.
 */
export
function showErrorMessage(host: Widget, title: string, error: Error): Promise<void> {
  console.error(error);
  if (!host.isAttached) {
    return;
  }
  // Find the file browser node.
  let node = host.node;
  while (!node.classList.contains(FILE_BROWSER_CLASS)) {
    node = node.parentElement;
  }
  let options = {
    title: title,
    host: node,
    body: error.message,
    buttons: [okButton]
  }
  return showDialog(options).then(() => {});
}


/**
 * Get the index of the node at a client position, or `-1`.
 */
export
function hitTestNodes(nodes: HTMLElement[] | NodeList, x: number, y: number): number {
  for (let i = 0, n = nodes.length; i < n; ++i) {
    if (hitTest(nodes[i] as HTMLElement, x, y)) return i;
  }
  return -1;
}


/**
 * Find the first element matching a class name.
 */
export
function findElement(parent: HTMLElement, className: string): HTMLElement {
  let elements = parent.getElementsByClassName(className);
  if (elements.length) return elements[0] as HTMLElement;
}
