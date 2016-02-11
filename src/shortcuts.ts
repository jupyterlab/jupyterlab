// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IShortcutItem
} from 'phosphide';

export
const SHORTCUTS: IShortcutItem[] = [
  {
    'command': 'command-palette:activate',
    'args': void 0,
    'selector': '*',
    'sequence': ['Alt Space']
  },
  {
    'command': 'command-palette:deactivate',
    'args': void 0,
    'selector': '*',
    'sequence': ['Escape']
  }
];
