// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IShortcutItem
} from 'phosphide';

export
const SHORTCUTS: IShortcutItem[] = [
  {
    command: 'command-palette:activate',
    args: void 0,
    selector: '*',
    sequence: ['Alt Space']
  },
  {
    command: 'command-palette:deactivate',
    args: void 0,
    selector: '*',
    sequence: ['Escape']
  },
  {
    command: 'file-operations:new-text-file',
    args: void 0,
    selector: '*',
    sequence: ['Ctrl O']
  },
  {
    command: 'file-operations:new-notebook',
    args: void 0,
    selector: '*',
    sequence: ['Ctrl Shift N']
  },
  {
    command: 'file-operations:save',
    args: void 0,
    selector: '.jp-Document.jp-mod-focus',
    sequence: ['Accel S']
  },
  {
    command: 'file-operations:revert',
    args: void 0,
    selector: '.jp-Document.jp-mod-focus',
    sequence: ['Accel R']
  },
  {
    command: 'file-operations:close',
    args: void 0,
    selector: '.jp-Document.jp-mod-focus',
    sequence: ['Ctrl Q']
  },
  {
    command: 'file-operations:close-all',
    args: void 0,
    selector: '.jp-Document',
    sequence: ['Ctrl Shift Q']
  }
];
