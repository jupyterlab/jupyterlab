// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as Backbone from 'backbone';

import {
    ManagerBase, shims
} from 'jupyter-js-widgets';

import {
  Panel
} from 'phosphor-panel';

import {
  BackboneViewWrapper
} from '../backboneviewwrapper/plugin';

import 'jquery-ui/themes/smoothness/jquery-ui.min.css';

import 'jupyter-js-widgets/css/widgets.min.css';

export
class WidgetManager extends ManagerBase {
  constructor(panel: Panel) {
    super()
    this._panel = panel;
  }

  display_view(msg: any, view: Backbone.View<any>, options: any): Promise<Backbone.View<any>> {
    return Promise.resolve(view).then(view => {
      this._panel.addChild(new BackboneViewWrapper(view));
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
  }

  private _panel: Panel;
}
