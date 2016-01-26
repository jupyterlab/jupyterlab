// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare module Widgets {
    export class ManagerBase {
        display_view(msg: any, view: any, options: any): Promise<any>;
        handle_comm_open(comm: Comm, msg: any): Promise<any>;
    }
    export class Comm {
        constructor(comm: any);
    }
}

declare module "jupyter-js-widgets" {
    export = Widgets;
}
