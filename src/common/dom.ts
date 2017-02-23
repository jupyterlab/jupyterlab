// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ElementExt
} from '@phosphor/domutils';


/**
 * Get the index of the node at a client position, or `-1`.
 */
export
function hitTestNodes(nodes: HTMLElement[] | NodeList, x: number, y: number): number {
  for (let i = 0, n = nodes.length; i < n; ++i) {
    if (ElementExt.hitTest(nodes[i] as HTMLElement, x, y)) {
      return i;
    }
  }
  return -1;
}


/**
 * Find the first element matching a class name.
 */
export
function findElement(parent: HTMLElement, className: string): HTMLElement {
  let elements = parent.getElementsByClassName(className);
  if (elements.length) {
    return elements[0] as HTMLElement;
  }
}
