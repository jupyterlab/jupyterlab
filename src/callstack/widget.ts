// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel } from '@phosphor/widgets';

export class CallstackWidget extends Panel {
  readonly header: Panel;

  readonly label: Widget;

  readonly toolbar: Toolbar;

  constructor() {
    super();

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebarVariables-header');
    this.addWidget(this.header);

    this.label = new Widget();
    this.label.node.textContent = 'Call stack';
    this.label.addClass('jp-DebuggerSidebarVariables-header-label');
    this.header.addWidget(this.label);

    const toolbar = new Toolbar();
    toolbar.addItem(
      'continue',
      new ToolbarButton({
        iconClassName: 'jp-RunIcon',
        onClick: () => {
          console.log('`run` was clicked');
        },
        tooltip: 'Continue'
      })
    );
    toolbar.addItem(
      'stop',
      new ToolbarButton({
        iconClassName: 'jp-StopIcon',
        onClick: () => {
          console.log('`stop` was clicked');
        },
        tooltip: 'Stop'
      })
    );
    toolbar.addItem('step-over', new ToolbarButton({ label: 'Step Over' }));
    toolbar.addItem('step-in', new ToolbarButton({ label: 'Step In' }));
    toolbar.addItem('step-out', new ToolbarButton({ label: 'Step Out' }));

    this.toolbar = toolbar;
    this.header.addWidget(this.toolbar);
  }
}
