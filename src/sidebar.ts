// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SplitPanel } from '@phosphor/widgets';
import { VariablesWidget } from './variables';

import { Debugger } from './debugger';

export class DebuggerSidebar extends SplitPanel {

  variables: VariablesWidget;

  constructor(model: Debugger.Model | null) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerSidebar');
    this.variables = new VariablesWidget();
    this.addWidget(this.variables);
  }

  public model: Debugger.Model | null = null;
}
