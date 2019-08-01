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

  public model: Debugger.Model | null = null;
}
