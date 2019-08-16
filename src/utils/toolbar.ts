// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';

const TOOLBAR_CLASS = 'jp-DebuggerToolbar';

const TOOLBAR_ITEM_CLASS = TOOLBAR_CLASS + '-item';

export class ToolbarWidget extends Widget {
  constructor() {
    super();
    this.addClass(TOOLBAR_CLASS);
  }

  // now create only non-clickable buttons
  createSpanElement(className: string, title: string) {
    const spanButton = document.createElement('span');
    spanButton.className = `${TOOLBAR_ITEM_CLASS} ${className}`;
    spanButton.title = title;
    this.node.appendChild(spanButton);
  }
}
