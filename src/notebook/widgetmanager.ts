// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
    ManagerBase, shims
} from 'jupyter-js-widgets';

//require('jupyter-js-widgets/static/components/bootstrap/css/bootstrap.css')
require('jupyter-js-widgets/node_modules/jquery-ui/themes/smoothness/jquery-ui.min.css')
require("jupyter-js-widgets/static/widgets/css/widgets.min.css");

export
class WidgetManager extends ManagerBase {
    constructor(el: HTMLElement) {
        super()
        this.el = el;

    }
   
    display_view(msg: any, view: any, options: any) {
        return Promise.resolve(view).then(view => {
            this.el.appendChild(view.el)
            view.on('remove', () => {
                console.log('View removed', view);
            });
            return view;
        });
    }
    
    
    /**
     * Handle when a comm is opened.
     */
    handle_comm_open(comm: any, msg: any) {
        // Convert jupyter-js-services comm to old comm
        // so that widget models use it compatibly
        
        let oldComm = new shims.services.Comm(comm);
        return super.handle_comm_open(oldComm, msg);        
    };

    
    el: HTMLElement;
}
