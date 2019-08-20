// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions = {}) {
    super();

    this.model = {};
    this.addClass('jp-DebuggerBreakpoints');
    this.title.label = 'Breakpoints';

    const header = new BreakpointsHeader(this.title.label);

    this.addWidget(header);
    this.addWidget(this.body);

    header.toolbar.addItem(
      'deactivate',
      new ToolbarButton({
        iconClassName: 'jp-DebuggerDeactivateIcon',
        onClick: () => {
          console.log('`deactivate` was clicked');
        },
        tooltip: 'Deactivate Breakpoints'
      })
    );
  }

  readonly body = new Panel();

  readonly model: Breakpoints.IModel;
}

class BreakpointsHeader extends Widget {
  constructor(title: string) {
    super({ node: document.createElement('header') });

    const layout = new PanelLayout();
    const span = new Widget({ node: document.createElement('span') });

    this.layout = layout;
    span.node.textContent = title;
    layout.addWidget(span);
    layout.addWidget(this.toolbar);
  }

  readonly toolbar = new Toolbar();
}

export namespace Breakpoints {
  /**
   * The breakpoints UI model.
   */
  export interface IModel {}

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {}
}
