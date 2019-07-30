// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@phosphor/disposable';

import { Widget } from '@phosphor/widgets';

import { IDebugger } from './tokens';

export class Debugger extends Widget implements IDebugger {
  constructor(options: Widget.IOptions = {}) {
    super(options);
    this.addClass('jp-Debugger');
  }

  readonly model = new Debugger.Model();

  get session(): IDebugger.ISession | null {
    return this.model.session;
  }
  set session(session: IDebugger.ISession | null) {
    this.model.session = session;
  }
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export class Model implements IDisposable {
    isDisposed = false;

    get session(): IDebugger.ISession | null {
      return this._session;
    }
    set session(session: IDebugger.ISession | null) {
      this._session = session;
    }

    dispose = (): void => undefined;

    private _session: IDebugger.ISession | null = null;
  }
}
