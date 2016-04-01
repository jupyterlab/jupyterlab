// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

//import * as Backbone from 'backbone';

import {
  IKernelIOPubCommOpenMessage, IComm
} from 'jupyter-js-services';

import {
    ManagerBase, shims
} from 'jupyter-js-widgets';

import {
  Panel
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  BackboneViewWrapper
} from '../backboneviewwrapper';

import {
  IRenderer, RenderMime
} from '../rendermime';

import 'jquery-ui/themes/smoothness/jquery-ui.min.css';

import 'jupyter-js-widgets/css/widgets.min.css';


/**
 * A widget manager that returns phosphor widgets.
 */
export
class WidgetManager extends ManagerBase<Widget> {
  /**
   * Return a phosphor widget representing the view
   */
  display_view(msg: any, view: Backbone.View<Backbone.Model>, options: any): Widget {
    return new BackboneViewWrapper(view);
  }

  /**
   * Handle when a comm is opened.
   */
  handle_comm_open(comm: IComm, msg: IKernelIOPubCommOpenMessage) {
    // Convert jupyter-js-services comm to old comm
    // so that widget models use it compatibly
    let oldComm = new shims.services.Comm(comm);
    return super.handle_comm_open(oldComm, msg);
  }
}

/**
 * A renderer for widgets.
 */
export
class WidgetRenderer implements IRenderer<Widget> {
  constructor(widgetManager: WidgetManager) {
    this._manager = widgetManager;
  }

  /**
   * Render a widget mimetype.
   */
  render(mimetype: string, data: string): Widget {
    // data is a model id
    let w = new Panel();
    this._manager.get_model(data).then((model: any) => {
      return this._manager.display_model(void 0, model, void 0);
    }).then((view: Widget) => {
        w.addChild(view);
    });
    return w;
  }
  
  public mimetypes = ['application/vnd.jupyter.widget'];
  private _manager: WidgetManager;
}
