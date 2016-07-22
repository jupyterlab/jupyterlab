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
  IRenderer
} from '../rendermime';

import {
  MarkdownRenderer, MarkdownItRenderer
} from '../renderers';


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
  constructor(context: IDocumentContext<IDocumentModel>, options: MarkdownWidget.IOptions = {}) {
    super();
    this.addClass(MD_CLASS);
    this.layout = new PanelLayout();
    this._renderer = options.renderer || MarkdownWidget.defaultRenderer;
    this._model = context.model;

    this.title.text = context.path.split('/').pop() + "markdown";

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
    let renderer = this._renderer;
    let model = this._model;
    let layout = this.layout as PanelLayout;
    let widget = renderer.render('text/markdown', model.toString());

    // Get the cursor position in CodeMirror

    if (layout.childCount()) {
      layout.childAt(0).dispose();
    }
    layout.addChild(widget);
  }

  private _renderer: IRenderer<Widget> = null;
  private _model: IDocumentModel = null;
}


/**
 * A widget factory for Markdown.
 */
export
class MarkdownWidgetFactory extends ABCWidgetFactory<MarkdownWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context, {renderer: new MarkdownRenderer()});
    this.widgetCreated.emit(widget);
    return widget;
  }
}

/**
 * A widget factory for MarkdownIt.
 */
export
class MarkdownItWidgetFactory extends ABCWidgetFactory<MarkdownWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context, {renderer: new MarkdownItRenderer()});
    this.widgetCreated.emit(widget);
    return widget;
  }
}

export
namespace MarkdownWidget {
  /**
   * The initialization options for a markdown widget.
   */
  export
  interface IOptions {
    /**
     * The renderer for the markdown widget.
     */
    renderer?: IRenderer<Widget>;
  }

  /**
   * The default Markdown renderer.
   */
  export
  const defaultRenderer = new MarkdownRenderer();
}