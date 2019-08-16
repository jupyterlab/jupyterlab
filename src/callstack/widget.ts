// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, Panel } from '@phosphor/widgets';

import { ToolbarWidget } from '../utils';

export class CallstackWidget extends Panel {
  readonly header: Panel;

  readonly label: Widget;

  readonly toolbar: ToolbarWidget;

  constructor() {
    super();

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebarVariables-header');
    this.addWidget(this.header);

    this.label = new Widget();
    this.label.node.textContent = 'Call stack';
    this.label.addClass('jp-DebuggerSidebarVariables-header-label');
    this.header.addWidget(this.label);

    this.toolbar = new ToolbarWidget();
    this.toolbar.createSpanElement(`fa fa-active`, 'Continue');
    this.toolbar.createSpanElement(`fa fa-stop`, 'Stop');
    this.toolbar.createSpanElement(`fa fa-stepOver`, 'Step Over');
    this.toolbar.createSpanElement(`fa fa-stepIn`, 'Step In');
    this.toolbar.createSpanElement(`fa fa-stepOut`, 'Step Out');
    this.header.addWidget(this.toolbar);
  }
}
