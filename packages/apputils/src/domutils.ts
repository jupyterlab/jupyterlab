// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';
import { UUID } from '@lumino/coreutils';
import { ElementExt } from '@lumino/domutils';

/**
 * The namespace for DOM utilities.
 */
export namespace DOMUtils {
  /**
   * Get the index of the node at a client position, or `-1`.
   */
  export function hitTestNodes(
    nodes: HTMLElement[] | HTMLCollection,
    x: number,
    y: number
  ): number {
    return ArrayExt.findFirstIndex(nodes, node => {
      return ElementExt.hitTest(node, x, y);
    });
  }

  /**
   * Find the first element matching a class name.
   * Only use this function when the element existence is guaranteed.
   */
  export function findElement(
    parent: HTMLElement,
    className: string
  ): HTMLElement {
    return parent.querySelector(`.${className}`) as HTMLElement;
  }

  /**
   * Find the first element matching a class name.
   */
  export function findElements(
    parent: HTMLElement,
    className: string
  ): HTMLCollectionOf<HTMLElement> {
    return parent.getElementsByClassName(
      className
    ) as HTMLCollectionOf<HTMLElement>;
  }

  /**
   * Create a DOM id with prefix "id-" to solve bug for UUIDs beginning with numbers.
   */
  export function createDomID(): string {
    return `id-${UUID.uuid4()}`;
  }

  /**
   * Check whether the active element descendant from given parent is editable.
   * When checking active elements it includes elements in the open shadow DOM.
   */
  export function hasActiveEditableElement(
    parent: Node | DocumentFragment,
    root: ShadowRoot | Document = document
  ): boolean {
    const element = root.activeElement;
    return !!(
      element &&
      parent.contains(element) &&
      (element.matches(':read-write') ||
        (element.shadowRoot &&
          hasActiveEditableElement(element.shadowRoot, element.shadowRoot)))
    );
  }
}
