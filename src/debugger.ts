// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRestorable, RestorablePool } from '@jupyterlab/coreutils';

import { Widget } from '@phosphor/widgets';

import { IDebugger } from './tokens';

export class Debugger extends Widget {
  constructor(options: Debugger.IOptions) {
    super();
    this.model = new Debugger.Model(options);
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
  export interface IOptions extends RestorablePool.IOptions {
    restore?: IRestorable.IOptions<IDebugger.ISession>;
  }

  export class Model extends RestorablePool<IDebugger.ISession>
    implements IDebugger {
    constructor(options: Debugger.Model.IOptions) {
      super({ namespace: options.namespace });
      if (options.restore) {
        requestAnimationFrame(() => {
          void this.restore(options.restore);
        });
      }
    }
  }

  export namespace Model {
    export interface IOptions extends Debugger.IOptions {}
  }
}
