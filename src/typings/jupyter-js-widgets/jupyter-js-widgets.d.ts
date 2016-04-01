// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../backbone/backbone-global.d.ts" />


declare module "jupyter-js-widgets" {
  import services = require('jupyter-js-services');

  export class ManagerBase<T> {
    display_view(msg: services.IKernelMessage, view: Backbone.View<Backbone.Model>, options: any): T;
    handle_comm_open(comm: shims.services.Comm, msg: services.IKernelIOPubCommOpenMessage): Promise<Backbone.Model>;
    // how do I say msg is an IKernelMessage from 'jupyter-js-services'?
    display_model(msg: services.IKernelMessage, model: Backbone.Model, options: any): Promise<T>;
    get_model(id: string): Promise<Backbone.Model>;
  }

  export namespace shims {
    export namespace services {
      export class Comm {
        constructor(comm: any);
      }
    }
  }
}
