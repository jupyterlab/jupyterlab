/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { WindowedList } from '@jupyterlab/ui-components';

export class NotebookRenderer extends WindowedList.Renderer {
  createWindow() {
    const el = super.createWindow();
    el.setAttribute('role', 'feed');
    el.setAttribute('aria-label', 'Cells');
    return el;
  }
}
