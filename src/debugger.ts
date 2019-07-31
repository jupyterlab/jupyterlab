// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { RestorablePool } from '@jupyterlab/coreutils';

import { Widget } from '@phosphor/widgets';

import { IDebugger } from './tokens';

export class Debugger extends Widget {
  constructor() {
    super();
    this.model = new Debugger.Model({
      namespace: this.id
    });
    this.addClass('jp-Debugger');
  }

  readonly model: Debugger.Model;

  get session(): IDebugger.ISession | null {
    return this.model.current;
  }
  set session(session: IDebugger.ISession | null) {
    this.model.current = session;
  }
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export class Model extends RestorablePool<IDebugger.ISession>
    implements IDebugger {}
}
