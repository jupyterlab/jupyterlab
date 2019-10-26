// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';
import { Body } from './body';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Signal, ISignal } from '@phosphor/signaling';

export class Callstack extends Panel {
  constructor(options: Callstack.IOptions) {
    super();

    this.model = options.model;
    this.addClass('jp-DebuggerCallstack');
    this.title.label = 'Callstack';

    const header = new CallstackHeader(this.title.label);
    const body = new Body(this.model);

    this.addWidget(header);
    this.addWidget(body);

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
  export interface IFrame extends DebugProtocol.StackFrame {}

  export interface IModel {}

  export class IModel implements IModel {
    constructor(model: IFrame[]) {
      this._state = model;
    }

    set frames(newFrames: IFrame[]) {
      this._state = newFrames;
      this._framesChanged.emit(newFrames);
    }

    get frames(): IFrame[] {
      return this._state;
    }

    set frame(frame: IFrame) {
      this._currentFrame = frame;
      this._currentFrameChanged.emit(frame);
    }

    get frame(): IFrame {
      return this._currentFrame;
    }

    get framesChanged(): ISignal<this, IFrame[]> {
      return this._framesChanged;
    }

    get currentFrameChanged(): ISignal<this, IFrame> {
      return this._currentFrameChanged;
    }

    private _state: IFrame[];
    private _currentFrame: IFrame;
    private _framesChanged = new Signal<this, IFrame[]>(this);
    private _currentFrameChanged = new Signal<this, IFrame>(this);
  }

  export interface IOptions extends Panel.IOptions {
    model: IModel;
  }
}
