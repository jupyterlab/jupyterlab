// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  IDocumentModel, IDocumentContext, ABCWidgetFactory
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';


/**
 * The class name added to a Jupyter MarkdownWidget
 */
const MD_CLASS = 'jp-MarkdownWidget';


/**
 * A widget for rendered markdown.
 */
export
class MarkdownWidget extends Widget {
  /**
   * Construct a new markdown widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>, rendermime: RenderMime) {
    super();
    this.addClass(MD_CLASS);
    this.layout = new PanelLayout();
    this.title.text = context.path.split('/').pop();
    this._rendermime = rendermime;
    rendermime.resolver = context;
    this._context = context;

    context.pathChanged.connect((c, path) => {
      this.title.text = path.split('/').pop();
    });

    context.model.contentChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Handle an `after-attach` message to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle an `update-request` message to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    let context = this._context;
    let model = context.model;
    let layout = this.layout as PanelLayout;
    let widget = this._rendermime.render({
     'text/markdown': model.toString(),
    });
    if (layout.childCount()) {
      layout.childAt(0).dispose();
    }
    layout.addChild(widget);
  }

  private _rendermime: RenderMime = null;
  private _context: IDocumentContext<IDocumentModel> = null;
}


/**
 * A widget factory for Markdown.
 */
export
class MarkdownWidgetFactory extends ABCWidgetFactory<MarkdownWidget, IDocumentModel> {
  /**
   * Construct a new markdown widget factory.
   */
  constructor(rendermime: RenderMime) {
    super();
    this._rendermime = rendermime;
  }

  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context, this._rendermime.clone());
    this.widgetCreated.emit(widget);
    return widget;
  }

  private _rendermime: RenderMime = null;
}
