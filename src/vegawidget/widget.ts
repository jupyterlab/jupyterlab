// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import embed = require('vega-embed');


/**
 * The class name added to a Vega widget.
 */
const VEGA_CLASS = 'jp-VegaWidget';

/**
 * The class name added to a VegaLite widget.
 */
const VEGALITE_CLASS = 'jp-VegaLiteWidget';


/**
 * A widget for csv tables.
 */
export
class BaseVegaWidget extends Widget {

  protected _vegaEmbedMode: string;
  private _vegaNode: HTMLElement;

  /**
   * Construct a new csv table widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;
    this.node.tabIndex = -1;
    this._vegaNode = document.createElement('div');
    this._vegaNode.className = 'vega-embed';
    this.node.appendChild(this._vegaNode);

    if (context.model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => {
      this.update();
    });
    context.model.contentChanged.connect(() => {
      this.update();
    });
    context.contentsModelChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.text = this._context.path.split('/').pop();
    let cm = this._context.contentsModel;
    if (cm === null) {
      return;
    }
    let content = this._context.model.toString();
    this.renderVega(content);
  }

  /**
   * Render an html table from a csv string.
   */
  renderVega(content: string) {
    let embedSpec = {
      mode: this._vegaEmbedMode,
      source: content
    };

    embed(this._vegaNode, embedSpec, function(error: any, result: any): any {});
  }

  private _context: IDocumentContext<IDocumentModel>;
}


/**
 * A widget for rendering Vega JSON
 */
export
class VegaWidget extends BaseVegaWidget {
  /**
   * Construct a VegaWidget
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super(context);
    this.addClass(VEGA_CLASS);
    this._vegaEmbedMode = 'vega';
  }
}


/**
 * A widget for rendering VegaLite JSON
 */
export
class VegaLiteWidget extends BaseVegaWidget {
  /**
   * Construct a VegaLiteWidget
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super(context);
    this.addClass(VEGALITE_CLASS);
    this._vegaEmbedMode = 'vega-lite';
  }
}


/**
 * A widget factory for the Vega widget
 */
export
class VegaWidgetFactory extends ABCWidgetFactory<VegaWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): VegaWidget {
    let widget = new VegaWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}


/**
 * A widget factory for the VegaLite widget
 */
export
class VegaLiteWidgetFactory extends ABCWidgetFactory<VegaLiteWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): VegaLiteWidget {
    let widget = new VegaLiteWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
