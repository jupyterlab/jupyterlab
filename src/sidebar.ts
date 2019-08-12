// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';

import { Debugger } from './debugger';

export class DebuggerSidebar extends Widget {
  constructor(model: Debugger.Model | null) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerSidebar');
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
