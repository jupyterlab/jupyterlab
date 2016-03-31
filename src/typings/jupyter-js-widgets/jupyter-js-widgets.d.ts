// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../backbone/backbone-global.d.ts" />

declare module Widgets {
    export class ManagerBase<T> {
        display_view(msg: any, view: Backbone.View<Backbone.Model>, options: any): T;
        handle_comm_open(comm: shims.services.Comm, msg: any): Promise<Backbone.Model>;
        // how do I say msg is an IKernelMessage from 'jupyter-js-services'?
        display_model(msg: any, model: Backbone.Model, options: any): Promise<T>;
        get_model(id: string): Promise<Backbone.Model>;
    }
    
    export module shims {
        export module services {
            export class Comm {
                constructor(comm: any);
            }            
        }
    }
}

declare module "jupyter-js-widgets" {
    export = Widgets;
}
