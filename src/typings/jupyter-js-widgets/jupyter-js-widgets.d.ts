// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../backbone/backbone-global.d.ts" />


declare module "jupyter-js-widgets" {
  // We have to use es5-style imports rather than es6-style imports
  // since typedoc only supports TS 1.6, and es6-style imports were
  // introduced in TS 1.7. See https://github.com/jasongrout/jupyter-js-ui/pull/1.
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
