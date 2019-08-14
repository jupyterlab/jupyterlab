// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SplitPanel } from '@phosphor/widgets';
import { VariablesWidget } from './variables';

import { Debugger } from './debugger';
import { CallstackWidget } from './callstack';
import { BreakPointsWidget } from './breakpoints';

export class DebuggerSidebar extends SplitPanel {
  variables: VariablesWidget;
  callstack: CallstackWidget;
  breakPoints: BreakPointsWidget;

  constructor(model: Debugger.Model | null) {
    super();
    this.model = model;
    this.orientation = 'vertical';
    this.addClass('jp-DebuggerSidebar');

    this.variables = new VariablesWidget();
    this.callstack = new CallstackWidget();
    this.breakPoints = new BreakPointsWidget();

    this.addWidget(this.variables);
    this.addWidget(this.callstack);
    this.addWidget(this.breakPoints);
  }

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
