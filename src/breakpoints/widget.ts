// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, Panel } from '@phosphor/widgets';

import { ToolbarWidget } from '../utils';

export class BreakPointsWidget extends Panel {
  readonly body: Panel;

  readonly header: Panel;

  readonly label: Widget;

  readonly toolbar: ToolbarWidget;

  constructor() {
    super();

    this.header = new Panel();
    this.header.addClass('jp-DebuggerSidebarVariables-header');
    this.addWidget(this.header);

    this.label = new Widget();
    this.label.node.textContent = 'BreakPoints';
    this.label.addClass('jp-DebuggerSidebarVariables-header-label');
    this.header.addWidget(this.label);

    this.toolbar = new ToolbarWidget();
    this.toolbar.createSpanElement(
      'fa fa-breakpoints disactive',
      'Deactive All Breakpoints'
    );
    this.toolbar.createSpanElement('fa fa-remove', 'Remove All Breakpoints');
    this.header.addWidget(this.toolbar);
  }
}
