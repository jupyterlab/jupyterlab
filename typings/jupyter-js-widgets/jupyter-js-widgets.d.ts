// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../backbone/backbone-global.d.ts" />


declare module "jupyter-js-widgets" {
  import * as services from 'jupyter-js-services';

  export class ManagerBase<T> {
    display_view(msg: services.KernelMessage.IMessage, view: Backbone.View<Backbone.Model>, options: any): T;
    handle_comm_open(comm: shims.services.Comm, msg: services.KernelMessage.ICommOpenMsg): Promise<Backbone.Model>;
    display_model(msg: services.KernelMessage.IMessage, model: Backbone.Model, options: any): Promise<T>;
    get_model(id: string): Promise<Backbone.Model>;
    validateVersion(): Promise<boolean>;
    comm_target_name: string;
  }

  export namespace shims {
    export namespace services {
      export class Comm {
        constructor(comm: any);
      }
    }
  }
}
