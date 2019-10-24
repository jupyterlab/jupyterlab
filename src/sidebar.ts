// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SplitPanel } from '@phosphor/widgets';

import { Breakpoints } from './breakpoints';

import { Callstack } from './callstack';

import { Variables } from './variables';

export class DebuggerSidebar extends SplitPanel {
  constructor() {
    super();
    this.orientation = 'vertical';
    this.addClass('jp-DebuggerSidebar');

    this.variables = new Variables();
    this.callstack = new Callstack();
    this.breakpoints = new Breakpoints({});

    this.addWidget(this.variables);
    this.addWidget(this.callstack);
    this.addWidget(this.breakpoints);
  }

  readonly variables: Variables;
  readonly callstack: Callstack;
  readonly breakpoints: Breakpoints;
}
