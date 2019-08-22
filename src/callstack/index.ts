// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';

export class Callstack extends Panel {
  constructor(options: Callstack.IOptions = {}) {
    super();

    this.model = {};
    this.addClass('jp-DebuggerCallstack');
    this.title.label = 'Callstack';

    const header = new CallstackHeader(this.title.label);

    this.addWidget(header);
    this.addWidget(this.body);

    header.toolbar.addItem(
      'continue',
      new ToolbarButton({
        iconClassName: 'jp-RunIcon',
        onClick: () => {
          console.log('`run` was clicked');
        },
        tooltip: 'Continue'
      })
    );
    header.toolbar.addItem(
      'stop',
      new ToolbarButton({
        iconClassName: 'jp-StopIcon',
        onClick: () => {
          console.log('`stop` was clicked');
        },
        tooltip: 'Stop'
      })
    );
    header.toolbar.addItem(
      'step-over',
      new ToolbarButton({
        iconClassName: 'jp-StepOverIcon',
        onClick: () => {
          console.log('`step over` was clicked');
        },
        tooltip: 'Step Over'
      })
    );
    header.toolbar.addItem(
      'step-in',
      new ToolbarButton({
        iconClassName: 'jp-StepInIcon',
        onClick: () => {
          console.log('`step in` was clicked');
        },
        tooltip: 'Step In'
      })
    );
    header.toolbar.addItem(
      'step-out',
      new ToolbarButton({
        iconClassName: 'jp-StepOutIcon',
        onClick: () => {
          console.log('`step out` was clicked');
        },
        tooltip: 'Step Out'
      })
    );
  }

  readonly body = new Panel();

  readonly model: Callstack.IModel;
}

class CallstackHeader extends Widget {
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

export namespace Callstack {
  export interface IModel {}

  export interface IOptions extends Panel.IOptions {}
}
