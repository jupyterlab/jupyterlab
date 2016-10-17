// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ActivityMonitor
} from '../common/activitymonitor';

import {
  DocumentRegistry, ABCWidgetFactory
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';


/**
 * The class name added to a Jupyter MarkdownWidget
 */
const MD_CLASS = 'jp-MarkdownWidget';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;


/**
 * A widget for rendered markdown.
 */
export
class MarkdownWidget extends Widget {
  /**
   * Construct a new markdown widget.
   */
  constructor(context: DocumentRegistry.IContext<DocumentRegistry.IModel>, rendermime: RenderMime) {
    super();
    this.addClass(MD_CLASS);
    this.layout = new PanelLayout();
    this.title.label = context.path.split('/').pop();
    this._rendermime = rendermime;
    rendermime.resolver = context;
    this._context = context;

    context.pathChanged.connect((c, path) => {
      this.title.label = path.split('/').pop();
    });

    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(() => { this.update(); });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._monitor.dispose();
    super.dispose();
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
    let bundle = { 'text/markdown': model.toString() };
    let widget = this._rendermime.render({ bundle });
    if (layout.widgets.length) {
      layout.widgets.at(0).dispose();
    }
    layout.addWidget(widget);
  }

  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel> = null;
  private _monitor: ActivityMonitor<any, any> = null;
  private _rendermime: RenderMime = null;
}


/**
 * A widget factory for Markdown.
 */
export
class MarkdownWidgetFactory extends ABCWidgetFactory<MarkdownWidget, DocumentRegistry.IModel> {
  /**
   * Construct a new markdown widget factory.
   */
  constructor(rendermime: RenderMime) {
    super();
    this._rendermime = rendermime;
  }

  /**
   * The name of the widget to display in dialogs.
   */
  get name(): string {
    return 'Rendered Markdown';
  }

  /**
   * The file extensions the widget can view.
   */
  get fileExtensions(): string[] {
    return ['.md'];
  }

  /**
   * Create a new widget given a context.
   */
  createNew(context: DocumentRegistry.IContext<DocumentRegistry.IModel>, kernel?: Kernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context, this._rendermime.clone());
    this.widgetCreated.emit(widget);
    return widget;
  }

  private _rendermime: RenderMime = null;
}
