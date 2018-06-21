// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  showErrorMessage
} from '@jupyterlab/apputils';

import {
  ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  IRenderMime, RenderMimeRegistry, MimeModel
} from '@jupyterlab/rendermime';

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  StackedLayout, Widget
} from '@phosphor/widgets';

import {
  ABCWidgetFactory, DocumentWidget
} from './default';

import {
  DocumentRegistry
} from './registry';


/**
 * A content widget for a rendered mimetype document.
 */
export
class MimeContent extends Widget {
  /**
   * Construct a new widget.
   */
  constructor(options: MimeContent.IOptions) {
    super();
    this.addClass('jp-MimeDocument');
    this.mimeType = options.mimeType;
    this._dataType = options.dataType || 'string';
    this._context = options.context;
    this._renderer = options.renderer;

    const layout = this.layout = new StackedLayout();
    layout.addWidget(this._renderer);

    this._context.ready.then(() => {
      return this._render();
    }).then(() => {

      // After rendering for the first time, send an activation request if we
      // are currently focused.
      if (this.node === document.activeElement) {
        // We want to synchronously send (not post) the activate message, while
        // we know this node still has focus.
        MessageLoop.sendMessage(this._renderer, Widget.Msg.ActivateRequest);
      }

      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: this._context.model.contentChanged,
        timeout: options.renderTimeout
      });
      this._monitor.activityStopped.connect(this.update, this);

      this._ready.resolve(undefined);
    }).catch(reason => {
      // Dispose the document if rendering fails.
      requestAnimationFrame(() => { this.dispose(); });
      showErrorMessage(`Renderer Failure: ${this._context.path}`, reason);
    });
  }

  /**
   * The mimetype for this rendered content.
   */
  readonly mimeType: string;

  /**
   * A promise that resolves when the widget is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this._monitor) {
      this._monitor.dispose();
    }
    this._monitor = null;
    super.dispose();
  }

  /**
   * Handle an `update-request` message to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this._context.isReady) {
      this._render();
    }
  }

  /**
   * Render the mime content.
   */
  private async _render(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    // Since rendering is async, we note render requests that happen while we
    // actually are rendering for a future rendering.
    if (this._isRendering) {
      this._renderRequested = true;
      return;
    }

    // Set up for this rendering pass.
    this._renderRequested = false;
    let context = this._context;
    let model = context.model;
    let data: JSONObject = {};
    if (this._dataType === 'string') {
      data[this.mimeType] = model.toString();
    } else {
      data[this.mimeType] = model.toJSON();
    }
    let mimeModel = new MimeModel({ data, callback: this._changeCallback });

    try {
      // Do the rendering asynchronously.
      this._isRendering = true;
      await this._renderer.renderModel(mimeModel);
      this._isRendering = false;

      // If there is an outstanding request to render, go ahead and render
      if (this._renderRequested) {
        return this._render();
      }
    } catch (reason) {
      // Dispose the document if rendering fails.
      requestAnimationFrame(() => { this.dispose(); });
      showErrorMessage(`Renderer Failure: ${context.path}`, reason);
    }
  }

  /**
   * A bound change callback.
   */
  private _changeCallback = (options: IRenderMime.IMimeModel.ISetDataOptions) => {
    if (!options.data || !options.data[this.mimeType]) {
      return;
    }
    let data = options.data[this.mimeType];
    if (typeof data === 'string') {
      this._context.model.fromString(data);
    } else {
      this._context.model.fromJSON(data);
    }
  }

  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  private _renderer: IRenderMime.IRenderer;
  private _monitor: ActivityMonitor<any, any> | null;
  private _ready = new PromiseDelegate<void>();
  private _dataType: 'string' | 'json';
  private _isRendering = false;
  private _renderRequested = false;
}


/**
 * The namespace for MimeDocument class statics.
 */
export
namespace MimeContent {
  /**
   * The options used to initialize a MimeDocument.
   */
  export
  interface IOptions {
    /**
     * Context
     */
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;

    /**
     * The renderer instance.
     */
    renderer: IRenderMime.IRenderer;

    /**
     * The mime type.
     */
    mimeType: string;

    /**
     * The render timeout.
     */
    renderTimeout: number;

    /**
     * Preferred data type from the model.
     */
    dataType?: 'string' | 'json';
  }
}

/**
 * A document widget for mime content.
 */
export
class MimeDocument extends DocumentWidget<MimeContent> {
}

/**
 * An implementation of a widget factory for a rendered mimetype document.
 */
export
class MimeDocumentFactory extends ABCWidgetFactory<MimeDocument> {
  /**
   * Construct a new markdown widget factory.
   */
  constructor(options: MimeDocumentFactory.IOptions) {
    super(Private.createRegistryOptions(options));
    this._rendermime = options.rendermime;
    this._renderTimeout = options.renderTimeout || 1000;
    this._dataType = options.dataType || 'string';
    this._fileType = options.primaryFileType;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): MimeDocument {
    const ft = this._fileType;
    const mimeType = ft.mimeTypes.length ? ft.mimeTypes[0] : 'text/plain';

    const rendermime = this._rendermime.clone({
      resolver: context.urlResolver
    });
    const renderer = rendermime.createRenderer(mimeType);

    const content = new MimeContent({
      context,
      renderer,
      mimeType,
      renderTimeout: this._renderTimeout,
      dataType: this._dataType,
    });

    content.title.iconClass = ft.iconClass;
    content.title.iconLabel = ft.iconLabel;

    const widget = new MimeDocument({ content, context });

    return widget;
  }

  private _rendermime: RenderMimeRegistry;
  private _renderTimeout: number;
  private _dataType: 'string' | 'json';
  private _fileType: DocumentRegistry.IFileType;
}


/**
 * The namespace for MimeDocumentFactory class statics.
 */
export
namespace MimeDocumentFactory {
  /**
   * The options used to initialize a MimeDocumentFactory.
   */
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * The primary file type associated with the document.
     */
    primaryFileType: DocumentRegistry.IFileType;

    /**
     * The rendermime instance.
     */
    rendermime: RenderMimeRegistry;

    /**
     * The render timeout.
     */
    renderTimeout?: number;

    /**
     * Preferred data type from the model.
     */
    dataType?: 'string' | 'json';
  }
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Create the document registry options.
   */
  export
  function createRegistryOptions(options: MimeDocumentFactory.IOptions): DocumentRegistry.IWidgetFactoryOptions {
    return { ...options, readOnly: true } as DocumentRegistry.IWidgetFactoryOptions;
  }
}
