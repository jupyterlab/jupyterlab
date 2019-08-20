// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SplitPanel } from '@phosphor/widgets';

import { BreakPoints } from './breakpoints';

import { Debugger } from './debugger';

import { Callstack } from './callstack';

import { Variables } from './variables';

export class DebuggerSidebar extends SplitPanel {
  constructor(model: Debugger.Model | null) {
    super();
    this.model = model;
    this.orientation = 'vertical';
    this.addClass('jp-DebuggerSidebar');

    this.variables = new Variables();
    this.callstack = new Callstack();
    this.breakPoints = new BreakPoints();

    this.addWidget(this.variables);
    this.addWidget(this.callstack);
    this.addWidget(this.breakPoints);
  }

  readonly variables: Variables;

  readonly callstack: Callstack;

  readonly breakPoints: BreakPoints;

  get model(): Debugger.Model | null {
    return this._model;
  }
  set model(model: Debugger.Model | null) {
    if (this._model === model) {
      return;
    }
    this._model = model;
    this.update();
  }

  private _model: Debugger.Model | null = null;
}
