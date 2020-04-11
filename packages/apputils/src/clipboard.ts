// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeData } from '@lumino/coreutils';

// 'string' is allowed so as to make it non-breaking for any 1.x releases
export type ClipboardData = string | MimeData;

/**
 * The clipboard interface.
 */
export namespace Clipboard {
  /**
   * Get the application clipboard instance.
   */
  export function getInstance(): MimeData {
    return Private.instance;
  }

  /**
   * Set the application clipboard instance.
   */
  export function setInstance(value: MimeData): void {
    Private.instance = value;
  }

  /**
   * Copy text to the system clipboard.
   *
   * #### Notes
   * This can only be called in response to a user input event.
   */
  export function copyToSystem(clipboardData: ClipboardData): void {
    const node = document.body;
    const handler = (event: ClipboardEvent) => {
      const data = event.clipboardData || (window as any).clipboardData;
      if (typeof clipboardData === 'string') {
        data.setData('text', clipboardData);
      } else {
        (clipboardData as MimeData).types().map((mimeType: string) => {
          data.setData(mimeType, clipboardData.getData(mimeType));
        });
      }
      event.preventDefault();
      node.removeEventListener('copy', handler);
    };
    node.addEventListener('copy', handler);
    generateEvent(node);
  }

  /**
   * Generate a clipboard event on a node.
   *
   * @param node - The element on which to generate the event.
   *
   * @param type - The type of event to generate.
   *   `'paste'` events cannot be programmatically generated.
   *
   * #### Notes
   * This can only be called in response to a user input event.
   */
  export function generateEvent(
    node: HTMLElement,
    type: 'copy' | 'cut' = 'copy'
  ): void {
    // http://stackoverflow.com/a/5210367

    // Identify selected text.
    let sel = window.getSelection();

    // Save the current selection.
    const savedRanges: any[] = [];
    for (let i = 0, len = sel?.rangeCount || 0; i < len; ++i) {
      savedRanges[i] = sel!.getRangeAt(i).cloneRange();
    }

    // Select the node content.
    const range = document.createRange();
    range.selectNodeContents(node);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Execute the command.
    document.execCommand(type);

    // Restore the previous selection.
    sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      for (let i = 0, len = savedRanges.length; i < len; ++i) {
        sel.addRange(savedRanges[i]);
      }
    }
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The application clipboard instance.
   */
  export let instance = new MimeData();
}
