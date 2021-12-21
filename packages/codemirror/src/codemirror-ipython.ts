// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Mode } from './mode';
import '@codemirror/legacy-modes/mode/python.js';

// Stub for the mkPython function.
declare let mkPython: any;

Mode.registerModeInfo({
  name: 'ipython',
  mime: 'text/x-ipython',
  load: () => {
    return Mode.legacy(mkPython({singleOperators: /\?/}))
  }
});

