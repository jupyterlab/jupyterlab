// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry, ABCWidgetFactory
} from '@jupyterlab/docregistry';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';


/**
 * The class name added to a Jupyter MarkdownViewer
 */
const MD_CLASS = 'jp-MarkdownViewer';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;


/**
 * A widget for rendered markdown.
 */
export
class MarkdownViewer extends Widget {
  /**
   * Construct a new markdown widget.
   */
  constructor(context: DocumentRegistry.Context, rendermime: RenderMime) {
    super();
    this.addClass(MD_CLASS);
    let layout = this.layout = new PanelLayout();
    let toolbar = new Widget();
    toolbar.addClass('jp-Toolbar');
    layout.addWidget(toolbar);
    this.title.label = context.path.split('/').pop();
    this._rendermime = rendermime;
    rendermime.resolver = context;
    this._context = context;

    context.pathChanged.connect(this._onPathChanged, this);

    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(this.update, this);
  }

  /**
   * The markdown widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._monitor.dispose();
    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
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
    let data = { 'text/markdown': model.toString() };
    let mimeModel = new MimeModel({ data, trusted: false });
    let widget = this._rendermime.render(mimeModel);
    if (layout.widgets.length === 2) {
      // The toolbar is layout.widgets[0]
      layout.widgets[1].dispose();
    }
    layout.addWidget(widget);
  }

  /**
   * Handle a path change.
   */
  private _onPathChanged(): void {
    this.title.label = this._context.path.split('/').pop();
  }

  private _context: DocumentRegistry.Context = null;
  private _monitor: ActivityMonitor<any, any> = null;
  private _rendermime: RenderMime = null;
}


/**
 * A widget factory for Markdown.
 */
export
class MarkdownViewerFactory extends ABCWidgetFactory<MarkdownViewer, DocumentRegistry.IModel> {
  /**
   * Construct a new markdown widget factory.
   */
  constructor(options: MarkdownViewerFactory.IOptions) {
    super(options);
    this._rendermime = options.rendermime;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): MarkdownViewer {
    return new MarkdownViewer(context, this._rendermime.clone());
  }

  private _rendermime: RenderMime = null;
}


/**
 * A namespace for `MarkdownViewerFactory` statics.
 */
export
namespace MarkdownViewerFactory {
  /**
   * The options used to create a markdown widget factory.
   */
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * A rendermime instance.
     */
    rendermime: RenderMime;
  }
}
