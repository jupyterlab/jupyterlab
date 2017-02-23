// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData
} from '@phosphor/coreutils';

import {
  Token
} from '@phosphor/application';


/* tslint:disable */
/**
 * The clipboard token.
 */
export
const IClipboard = new Token<IClipboard>('jupyter.services.clipboard');
/* tslint:enable */


/**
 * The clipboard interface.
 */
export
interface IClipboard extends MimeData {}

/**
 * Copy text to the system clipboard.
 *
 * #### Notes
 * This can only be called in response to a user input event.
 */
export
function copyToClipboard(text: string): void {
  let node = document.body;
  let handler = (event: ClipboardEvent) => {
    let data = event.clipboardData || (window as any).clipboardData;
    data.setData('text', text);
    event.preventDefault();
    node.removeEventListener('copy', handler);
  };
  node.addEventListener('copy', handler);
  generateClipboardEvent(node);
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
export
function generateClipboardEvent(node: HTMLElement, type: 'copy' | 'cut' = 'copy'): void {
  // http://stackoverflow.com/a/5210367

  // Identify selected text.
  let sel = window.getSelection();

  // Save the current selection.
  let savedRanges: any[] = [];
  for (let i = 0, len = sel.rangeCount; i < len; ++i) {
    savedRanges[i] = sel.getRangeAt(i).cloneRange();
  }

  // Select the node content.
  let range = document.createRange();
  range.selectNodeContents(node);
  sel.removeAllRanges();
  sel.addRange(range);

  // Execute the command.
  document.execCommand(type);

  // Restore the previous selection.
  sel = window.getSelection();
  sel.removeAllRanges();
  for (let i = 0, len = savedRanges.length; i < len; ++i) {
    sel.addRange(savedRanges[i]);
  }
}
