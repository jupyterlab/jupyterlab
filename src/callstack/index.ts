// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandToolbarButton, Toolbar } from '@jupyterlab/apputils';

import { CommandRegistry } from '@phosphor/commands';
import { ISignal, Signal } from '@phosphor/signaling';
import { Panel, PanelLayout, Widget } from '@phosphor/widgets';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Body } from './body';

export class Callstack extends Panel {
  constructor(options: Callstack.IOptions) {
    super();

    const { commands, model } = options;

    this.model = model;
    this.addClass('jp-DebuggerCallstack');
    this.title.label = 'Callstack';

    const header = new CallstackHeader(this.title.label);
    const body = new Body(this.model);

    this.addWidget(header);
    this.addWidget(body);

    header.toolbar.addItem(
      'continue',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.continue
      })
    );

    header.toolbar.addItem(
      'terminate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.terminate
      })
    );

    header.toolbar.addItem(
      'step-over',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.next
      })
    );

    header.toolbar.addItem(
      'step-in',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepIn
      })
    );

    header.toolbar.addItem(
      'step-out',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepOut
      })
    );
  }

  readonly model: Callstack.Model;
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

  export class Model {
    constructor(model: IFrame[]) {
      this._state = model;
    }

    set frames(newFrames: IFrame[]) {
      this._state = newFrames;
      // default to the new frame is the previous one can't be found
      if (!this.frame || !newFrames.find(frame => frame.id === this.frame.id)) {
        this.frame = newFrames[0];
      }
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

  export interface ICommands {
    /**
     * The command registry.
     */
    registry: CommandRegistry;

    /**
     * The continue command ID.
     */
    continue: string;

    /**
     * The terminate command ID.
     */
    terminate: string;

    /**
     * The next / stepOver command ID.
     */
    next: string;

    /**
     * The stepIn command ID.
     */
    stepIn: string;

    /**
     * The stepOut command ID.
     */
    stepOut: string;
  }

  export interface IOptions extends Panel.IOptions {
    /**
     * The toolbar commands interface for the callstack.
     */
    commands: ICommands;

    model: Model;
  }
}
