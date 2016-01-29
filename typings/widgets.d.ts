// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare module Widgets {
    export class ManagerBase {
        display_view(msg: any, view: any, options: any): Promise<any>;
        handle_comm_open(comm: shims.services.Comm, msg: any): Promise<any>;
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
