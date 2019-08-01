// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDataConnector } from '@jupyterlab/coreutils';

import { Widget } from '@phosphor/widgets';

import { ReadonlyJSONValue, UUID } from '@phosphor/coreutils';

export class Debugger extends Widget {
  constructor(options: Debugger.IOptions) {
    super();
    this.model = new Debugger.Model(options);
    this.addClass('jp-Debugger');
  }

  readonly model: Debugger.Model;
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export interface IOptions {
    connector?: IDataConnector<ReadonlyJSONValue>;

    id?: string;
  }

  export class Model {
    constructor(options: Debugger.Model.IOptions) {
      this.connector = options.connector || null;
      this.id = options.id || UUID.uuid4();
      console.log('Create new Debugger.Model', this.id, this.connector);
    }

    readonly connector: IDataConnector<ReadonlyJSONValue> | null;

    readonly id: string;
  }

  export namespace Model {
    export interface IOptions extends Debugger.IOptions {}
  }
}
