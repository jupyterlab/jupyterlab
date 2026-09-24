// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Printing, showErrorMessage } from '@jupyterlab/apputils';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { ActivityMonitor } from '@jupyterlab/coreutils';
import type { IRenderMime, IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { MimeModel } from '@jupyterlab/rendermime';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { PartialJSONObject, PartialJSONValue } from '@lumino/coreutils';
import { JSONExt, PromiseDelegate } from '@lumino/coreutils';
import type { Message } from '@lumino/messaging';
import { MessageLoop } from '@lumino/messaging';
import { StackedLayout, Widget } from '@lumino/widgets';
import { ABCWidgetFactory, DocumentWidget } from './default';
import type { DocumentRegistry } from './registry';

/**
 * A content widget for a rendered mimetype document.
 */
export class MimeContent extends Widget {
  /**
   * Construct a new widget.
   */
  constructor(options: MimeContent.IOptions) {
    super();
    this.addClass('jp-MimeDocument');
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.mimeType = options.mimeType;
    this._dataType = options.dataType || 'string';
    this._context = options.context;
    this.renderer = options.renderer;

    const layout = (this.layout = new StackedLayout());
    layout.addWidget(this.renderer);

    this._context.ready
      .then(() => {
        return this._render();
      })
      .then(() => {
        // After rendering for the first time, send an activation request if we
        // are currently focused.
        if (this.node === document.activeElement) {
          // We want to synchronously send (not post) the activate message, while
          // we know this node still has focus.
          MessageLoop.sendMessage(this.renderer, Widget.Msg.ActivateRequest);
        }

        // Throttle the rendering rate of the widget.
        this._monitor = new ActivityMonitor({
          signal: this._context.model.contentChanged,
          timeout: options.renderTimeout
        });
        this._monitor.activityStopped.connect(this.update, this);

        this._ready.resolve(undefined);
      })
      .catch(reason => {
        // Dispose the document if rendering fails.
        requestAnimationFrame(() => {
          this.dispose();
        });
        void showErrorMessage(
          this._trans.__('Renderer Failure: %1', this._context.path),
          reason
        );
      });
  }

  /**
   * The mimetype for this rendered content.
   */
  readonly mimeType: string;

  /**
   * Print method. Deferred to the renderer.
   */
  [Printing.symbol](): Printing.OptionalAsyncThunk {
    return Printing.getPrintFunction(this.renderer);
  }

  /**
   * A promise that resolves when the widget is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Set URI fragment identifier.
   */
  setFragment(fragment: string): void {
    this._fragment = fragment;
    this.update();
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
      void this._render();
      this._fragment = '';
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
    const context = this._context;
    const model = context.model;
    const data: PartialJSONObject = {};
    if (this._dataType === 'string') {
      data[this.mimeType] = model.toString();
    } else {
      // `model.toJSON()` parses the document source, which throws when the
      // content is not valid JSON. Surface that as an inline error in the
      // widget (and keep the document open) rather than letting the render
      // pass fail silently. See https://github.com/jupyterlab/jupyterlab/issues/4490
      try {
        data[this.mimeType] = model.toJSON();
      } catch (reason) {
        this._setError(
          this._trans.__('The file does not contain valid JSON: %1', `${reason}`)
        );
        return;
      }
    }
    this._setError(null);
    const mimeModel = new MimeModel({
      data,
      callback: this._changeCallback,
      metadata: { fragment: this._fragment }
    });

    try {
      // Do the rendering asynchronously.
      this._isRendering = true;
      await this.renderer.renderModel(mimeModel);
      this._isRendering = false;

      // If there is an outstanding request to render, go ahead and render
      if (this._renderRequested) {
        return this._render();
      }
    } catch (reason) {
      // Dispose the document if rendering fails.
      requestAnimationFrame(() => {
        this.dispose();
      });
      void showErrorMessage(
        this._trans.__('Renderer Failure: %1', context.path),
        reason
      );
    }
  }

  /**
   * Show or clear an inline error banner in the widget.
   *
   * @param message - The error message to show, or `null` to clear it.
   *
   * #### Notes
   * While an error is shown, the (now stale) rendered content is hidden so
   * that the viewer reflects the current error state rather than the last
   * successfully rendered value. The content is shown again once the error
   * is cleared and the document is valid.
   */
  private _setError(message: string | null): void {
    if (message === null) {
      if (this._errorNode) {
        this._errorNode.remove();
        this._errorNode = null;
      }
      this.removeClass('jp-MimeDocument-error');
      this.renderer.show();
      return;
    }
    if (!this._errorNode) {
      this._errorNode = document.createElement('div');
      this._errorNode.className = 'jp-MimeDocument-errorBanner';
      this._errorNode.setAttribute('role', 'alert');
      this.node.insertBefore(this._errorNode, this.node.firstChild);
    }
    this._errorNode.textContent = message;
    this.addClass('jp-MimeDocument-error');
    // Hide the stale rendered content while the source is invalid.
    this.renderer.hide();
  }

  /**
   * A bound change callback.
   */
  private _changeCallback = (
    options: IRenderMime.IMimeModel.ISetDataOptions
  ) => {
    if (!options.data || !options.data[this.mimeType]) {
      return;
    }
    const data = options.data[this.mimeType];
    if (typeof data === 'string') {
      if (data !== this._context.model.toString()) {
        this._context.model.fromString(data);
      }
    } else if (data !== null && data !== undefined) {
      // `model.toJSON()` throws when the current source is not valid JSON.
      // In that case the renderer callback is operating on stale data, so
      // skip applying the write rather than letting the parse error escape.
      let current: PartialJSONValue;
      try {
        current = this._context.model.toJSON();
      } catch {
        return;
      }
      if (!JSONExt.deepEqual(data, current)) {
        this._context.model.fromJSON(data);
      }
    }
  };

  readonly renderer: IRenderMime.IRenderer;

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  private _fragment = '';
  private _monitor: ActivityMonitor<DocumentRegistry.IModel, void> | null;
  private _ready = new PromiseDelegate<void>();
  private _dataType: 'string' | 'json';
  private _errorNode: HTMLDivElement | null = null;
  private _isRendering = false;
  private _renderRequested = false;
}

/**
 * The namespace for MimeDocument class statics.
 */
export namespace MimeContent {
  /**
   * The options used to initialize a MimeDocument.
   */
  export interface IOptions {
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

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A document widget for mime content.
 */
export class MimeDocument extends DocumentWidget<MimeContent> {
  setFragment(fragment: string): void {
    this.content.setFragment(fragment);
  }
}

/**
 * An implementation of a widget factory for a rendered mimetype document.
 */
export class MimeDocumentFactory extends ABCWidgetFactory<MimeDocument> {
  /**
   * Construct a new mimetype widget factory.
   */
  constructor(options: MimeDocumentFactory.IOptions<MimeDocument>) {
    super(Private.createRegistryOptions(options));
    this._rendermime = options.rendermime;
    this._renderTimeout =
      options.renderTimeout === undefined || options.renderTimeout === 0
        ? 1000
        : options.renderTimeout;
    this._dataType = options.dataType || 'string';
    this._fileType = options.primaryFileType;
    this._factory = options.factory;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): MimeDocument {
    const ft = this._fileType;
    const mimeTypes = ft?.mimeTypes ?? [];
    const mimeType =
      mimeTypes.length > 0
        ? mimeTypes[0]
        : IEditorMimeTypeService.defaultMimeType;

    const rendermime = this._rendermime.clone({
      resolver: context.urlResolver
    });

    let renderer: IRenderMime.IRenderer;
    if (this._factory && this._factory.mimeTypes.includes(mimeType)) {
      renderer = this._factory.createRenderer({
        mimeType,
        resolver: rendermime.resolver,
        sanitizer: rendermime.sanitizer,
        linkHandler: rendermime.linkHandler,
        latexTypesetter: rendermime.latexTypesetter,
        markdownParser: rendermime.markdownParser
      });
    } else {
      renderer = rendermime.createRenderer(mimeType);
    }

    const content = new MimeContent({
      context,
      renderer,
      mimeType,
      renderTimeout: this._renderTimeout,
      dataType: this._dataType
    });

    content.title.icon = ft?.icon;
    content.title.iconClass = ft?.iconClass ?? '';
    content.title.iconLabel = ft?.iconLabel ?? '';

    const widget = new MimeDocument({ content, context });

    return widget;
  }

  private _rendermime: IRenderMimeRegistry;
  private _renderTimeout: number;
  private _dataType: 'string' | 'json';
  private _fileType: DocumentRegistry.IFileType | undefined;
  private _factory: IRenderMime.IRendererFactory | undefined;
}

/**
 * The namespace for MimeDocumentFactory class statics.
 */
export namespace MimeDocumentFactory {
  /**
   * The options used to initialize a MimeDocumentFactory.
   */
  export interface IOptions<
    T extends MimeDocument
  > extends DocumentRegistry.IWidgetFactoryOptions<T> {
    /**
     * The primary file type associated with the document.
     */
    primaryFileType: DocumentRegistry.IFileType | undefined;

    /**
     * The rendermime instance.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The render timeout.
     */
    renderTimeout?: number;

    /**
     * Preferred data type from the model.
     */
    dataType?: 'string' | 'json';

    /**
     * Optional renderer to use (overriding the renderer in the registry)
     */
    factory?: IRenderMime.IRendererFactory;
  }
}

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Create the document registry options.
   */
  export function createRegistryOptions(
    options: MimeDocumentFactory.IOptions<MimeDocument>
  ): DocumentRegistry.IWidgetFactoryOptions<MimeDocument> {
    return {
      ...options,
      readOnly: true
    } as DocumentRegistry.IWidgetFactoryOptions<MimeDocument>;
  }
}
