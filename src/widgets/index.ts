// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Backbone from 'backbone';

import {
  IKernel, KernelMessage
} from 'jupyter-js-services';

import {
    ManagerBase, shims
} from 'jupyter-js-widgets';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  Panel
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  IRenderer
} from '../rendermime';

import {
  IDocumentContext, IDocumentModel
} from '../docregistry';

import 'jquery-ui/themes/smoothness/jquery-ui.min.css';

import 'jupyter-js-widgets/css/widgets.min.css';


/**
 * The class name added to an BackboneViewWrapper widget.
 */
const BACKBONEVIEWWRAPPER_CLASS = 'jp-BackboneViewWrapper';


/**
 * A phosphor widget which wraps a `Backbone` view instance.
 */
export
class BackboneViewWrapper extends Widget {
  /**
   * Construct a new `Backbone` wrapper widget.
   *
   * @param view - The `Backbone.View` instance being wrapped.
   */
  constructor(view: Backbone.View<any>) {
    super();
    this._view = view;
    view.on('remove', () => {
      this.dispose();
      console.log('View removed', view);
    });
    this.addClass(BACKBONEVIEWWRAPPER_CLASS);
    this.node.appendChild(view.el);
  }

  onAfterAttach(msg: any) {
    this._view.trigger('displayed');
  }

  dispose() {
    this._view = null;
    super.dispose();
  }

  private _view: Backbone.View<any> = null;
}


/**
 * A widget manager that returns phosphor widgets.
 */
export
class WidgetManager extends ManagerBase<Widget> implements IDisposable {
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;

    let newKernel = (kernel: IKernel) => {
        if (this._commRegistration) {
          this._commRegistration.dispose();
        }
        if (!kernel) {
          return;
        }
        this._commRegistration = kernel.registerCommTarget(this.comm_target_name,
        (comm, msg) => {this.handle_comm_open(comm, msg)});
    };

    context.kernelChanged.connect((sender, kernel) => {
      if (context.kernel) {
        this.validateVersion();
      }
      newKernel(kernel);
    });

    if (context.kernel) {
      this.validateVersion();
      newKernel(context.kernel);
    }
  }
  /**
   * Return a phosphor widget representing the view
   */
  display_view(msg: any, view: Backbone.View<Backbone.Model>, options: any): Widget {
    return (view as any).pWidget ? (view as any).pWidget : new BackboneViewWrapper(view);
  }

  /**
   * Handle when a comm is opened.
   */
  handle_comm_open(comm: IKernel.IComm, msg: KernelMessage.ICommOpenMsg) {
    // Convert jupyter-js-services comm to old comm
    // so that widget models use it compatibly
    let oldComm = new shims.services.Comm(comm);
    return super.handle_comm_open(oldComm, msg);
  }

  /**
   * Create a comm.
   */
   _create_comm(target_name: string, model_id: string, data?: any): Promise<any> {
    let comm = this._context.kernel.connectToComm(target_name, model_id);
    comm.open(); // should we open it???
    return Promise.resolve(new shims.services.Comm(comm));
  }

  /**
   * Get the currently-registered comms.
   */
  _get_comm_info(): Promise<any> {
    return this._context.kernel.commInfo({target: 'jupyter.widget'}).then((reply) => {
      return reply.content.comms;
    })
  }

  /**
   * Get whether the manager is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._context === null;
  }

  /**
   * Dispose the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._commRegistration) {
      this._commRegistration.dispose();
    }
    this._context = null;
  }

  _context: IDocumentContext<IDocumentModel>;
  _commRegistration: IDisposable;
}


/**
 * A renderer for widgets.
 */
export
class WidgetRenderer implements IRenderer<Widget>, IDisposable {
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

  /**
   * Get whether the manager is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._manager === null;
  }

  /**
   * Dispose the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager = null;
  }

  public mimetypes = ['application/vnd.jupyter.widget'];
  private _manager: WidgetManager;
}
