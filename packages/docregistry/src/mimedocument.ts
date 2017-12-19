// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  BoxLayout, Widget
} from '@phosphor/widgets';

import {
  ActivityMonitor, PathExt
} from '@jupyterlab/coreutils';

import {
  IRenderMime, RenderMimeRegistry, MimeModel
} from '@jupyterlab/rendermime';

import {
  ABCWidgetFactory
} from './default';

import {
  DocumentRegistry
} from './registry';


/**
 * A widget for rendered mimetype document.
 */
export
class MimeDocument extends Widget implements DocumentRegistry.IReadyWidget {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: MimeDocument.IOptions) {
    super();
    this.addClass('jp-MimeDocument');
    this.node.tabIndex = -1;
    let layout = this.layout = new BoxLayout();
    let toolbar = new Widget();
    toolbar.addClass('jp-Toolbar');
    layout.addWidget(toolbar);
    BoxLayout.setStretch(toolbar, 0);
    let context = options.context;
    this.rendermime = options.rendermime.clone({ resolver: context });

    this._context = context;
    this._mimeType = options.mimeType;
    this._dataType = options.dataType || 'string';

    this._renderer = this.rendermime.createRenderer(this._mimeType);
    layout.addWidget(this._renderer);
    BoxLayout.setStretch(this._renderer, 1);

    context.pathChanged.connect(this._onPathChanged, this);
    this._onPathChanged();

    this._context.ready.then(() => {
      if (this.isDisposed) {
        return;
      }
      return this._render().then();
    }).then(() => {
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: options.renderTimeout
      });
      this._monitor.activityStopped.connect(this.update, this);

      this._ready.resolve(undefined);
    });
  }

  /**
   * The markdown widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * The rendermime instance associated with the widget.
   */
  readonly rendermime: RenderMimeRegistry;

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
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    if (!this._hasRendered) {
      this.node.focus();
      return;
    }
    MessageLoop.sendMessage(this._renderer, Widget.Msg.ActivateRequest);
    if (!this.node.contains(document.activeElement)) {
      this.node.focus();
    }
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
  private _render(): Promise<void> {
    let context = this._context;
    let model = context.model;
    let data: JSONObject = {};
    if (this._dataType === 'string') {
      data[this._mimeType] = model.toString();
    } else {
      data[this._mimeType] = model.toJSON();
    }
    let mimeModel = new MimeModel({ data, callback: this._changeCallback });

    return this._renderer.renderModel(mimeModel).then(() => {
      // Handle the first render after an activation.
      if (!this._hasRendered && this.node === document.activeElement) {
        MessageLoop.sendMessage(this._renderer, Widget.Msg.ActivateRequest);
      }
      this._hasRendered = true;
    });
  }

  /**
   * Handle a path change.
   */
  private _onPathChanged(): void {
    this.title.label = PathExt.basename(this._context.localPath);
  }

  /**
   * A bound change callback.
   */
  private _changeCallback = (options: IRenderMime.IMimeModel.ISetDataOptions) => {
    if (!options.data || !options.data[this._mimeType]) {
      return;
    }
    let data = options.data[this._mimeType];
    if (typeof data === 'string') {
      this._context.model.fromString(data);
    } else {
      this._context.model.fromJSON(data);
    }
  }

  private _context: DocumentRegistry.Context;
  private _monitor: ActivityMonitor<any, any> | null;
  private _renderer: IRenderMime.IRenderer;
  private _mimeType: string;
  private _ready = new PromiseDelegate<void>();
  private _dataType: 'string' | 'json';
  private _hasRendered = false;
}


/**
 * The namespace for MimeDocument class statics.
 */
export
namespace MimeDocument {
  /**
   * The options used to initialize a MimeDocument.
   */
  export
  interface IOptions {
    /**
     * The document context.
     */
    context: DocumentRegistry.Context;

    /**
     * The rendermime instance.
     */
    rendermime: RenderMimeRegistry;

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
 * An implementation of a widget factory for a rendered mimetype document.
 */
export
class MimeDocumentFactory extends ABCWidgetFactory<MimeDocument, DocumentRegistry.IModel> {
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
    let ft = this._fileType;
    let mimeType = ft.mimeTypes.length ? ft.mimeTypes[0] : 'text/plain';
    let widget = new MimeDocument({
      context,
      mimeType,
      rendermime: this._rendermime.clone(),
      renderTimeout: this._renderTimeout,
      dataType: this._dataType,
    });

    widget.title.iconClass = ft.iconClass;
    widget.title.iconLabel = ft.iconLabel;
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
