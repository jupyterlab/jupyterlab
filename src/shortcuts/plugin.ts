// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Application
} from 'phosphide/lib/core/application';


/**
 * The list of default application shortcuts.
 *
 * #### Notes
 * When setting shortcut selectors, there are two concepts to consider:
 * specificity and matchability. These two interact in sometimes
 * counterintuitive ways. Keyboard events are triggered from an element and
 * they propagate up the DOM until they reach the `documentElement` (`<body>`).
 *
 * When a registered shortcut sequence is fired, the shortcut manager checks
 * the node that fired the event and each of its ancestors until a node matches
 * one or more registered selectors. The *first* matching selector in the
 * chain of ancestors will invoke the shortcut handler and the travelsal will
 * end at that point. If a node matches more than one selector, the handler for
 * whichever selector is more *specific* fires.
 * @see https://www.w3.org/TR/css3-selectors/#specificity
 *
 * The practical consequence of this is that a very broadly matching selector,
 * e.g. `'*'` or `'div'` may match and therefore invoke a handler *before* a
 * more specific selector. The most common pitfall is to use the universal
 * (`'*'`) selector. For almost any use case where a global keyboard shortcut is
 * required, using the `'body'` selector is more appropriate.
 */
const SHORTCUTS = [
  {
    command: 'command-palette:toggle',
    selector: 'body',
    sequence: ['Accel Shift P']
  },
  {
    command: 'command-palette:hide',
    selector: 'body[data-left-area="command-palette"]',
    sequence: ['Escape']
  },
  {
    command: 'file-browser:toggle',
    selector: 'body',
    sequence: ['Accel Shift F']
  },
  {
    command: 'file-browser:hide',
    selector: 'body[data-left-area="file-browser"]',
    sequence: ['Escape']
  },
  {
    command: 'file-operations:new-text-file',
    selector: 'body',
    sequence: ['Ctrl O']
  },
  {
    command: 'file-operations:new-notebook',
    selector: 'body',
    sequence: ['Ctrl Shift N']
  },
  {
    command: 'file-operations:save',
    selector: '.jp-Document',
    sequence: ['Accel S']
  },
  {
    command: 'file-operations:close',
    selector: '.jp-Document',
    sequence: ['Ctrl Q']
  },
  {
    command: 'file-operations:close-all',
    selector: '.jp-Document',
    sequence: ['Ctrl Shift Q']
  },
  {
    command: 'notebook:run-selected-cell',
    selector: '.jp-Notebook-cell',
    sequence: ['Shift Enter']
  },
  {
    command: 'help-doc:toggle',
    selector: 'body',
    sequence: ['Accel Shift H']
  },
  {
    command: 'help-doc:hide',
    selector: 'body[data-right-area="help-doc"]',
    sequence: ['Escape']
  }
];


/**
 * The default shortcuts extension.
 */
export
const shortcutsExtension = {
  id: 'jupyter.extensions.shortcuts',
  activate: (app: Application): Promise<void> => {
    app.shortcuts.add(SHORTCUTS);
    return Promise.resolve(void 0);
  }
};


