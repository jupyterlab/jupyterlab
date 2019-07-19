// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';

import { IDebugger } from './tokens';

export class Debugger extends Widget implements IDebugger {
  constructor(options: Widget.IOptions = {}) {
    super(options);
    this.addClass('jp-Debugger');
  }
}