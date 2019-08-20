// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel } from '@phosphor/widgets';

export class BreakPoints extends Panel {
  readonly body: Panel;

  readonly header: Panel;

  readonly label: Widget;

  readonly toolbar: Toolbar;

  constructor() {
    super();

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebar-item-header');
    this.addWidget(this.header);

    this.label = new Widget();
    this.label.node.textContent = 'BreakPoints';
    this.label.addClass('jp-DebuggerSidebar-item-header-label');
    this.header.addWidget(this.label);

    const toolbar = new Toolbar();
    toolbar.addItem(
      'deactivate',
      new ToolbarButton({
        iconClassName: 'jp-DebuggerDeactivateIcon',
        onClick: () => {
          console.log('`deactivate` was clicked');
        },
        tooltip: 'Deactivate Breakpoints'
      })
    );
    this.toolbar = toolbar;
    this.header.addWidget(this.toolbar);
  }
}

export namespace BreakPoints {}
