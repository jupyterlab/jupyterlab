// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Mode } from './mode';
import { mkPython } from '@codemirror/legacy-modes/mode/python';

Mode.registerModeInfo({
  name: 'ipython',
  mime: 'text/x-ipython',
  load: () => {
    return Mode.legacy(mkPython({ singleOperators: /\?/ }));
  }
});
