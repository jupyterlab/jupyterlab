// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import { ActivityMonitor } from '@jupyterlab/coreutils';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import {
  IRenderMime,
  IRenderMimeRegistry,
  MimeModel
} from '@jupyterlab/rendermime';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { JSONObject, PromiseDelegate } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { StackedLayout, Widget } from '@lumino/widgets';

/**
 * The class name added to a markdown viewer.
 */
const MARKDOWNVIEWER_CLASS = 'jp-MarkdownViewer';

/**
 * The markdown MIME type.
 */
const MIMETYPE = 'text/markdown';

/**
 * A widget for markdown documents.
 */
export class MarkdownViewer extends Widget {
  /**
   * Construct a new markdown viewer widget.
   */
  constructor(options: MarkdownViewer.IOptions) {
    super();
    this.context = options.context;
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.renderer = options.renderer;
    this.node.tabIndex = 0;
    this.addClass(MARKDOWNVIEWER_CLASS);

    const layout = (this.layout = new StackedLayout());
    layout.addWidget(this.renderer);

    void this.context.ready.then(async () => {
      await this._render();

      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: this.context.model.contentChanged,
        timeout: this._config.renderTimeout
      });
      this._monitor.activityStopped.connect(this.update, this);

      this._ready.resolve(undefined);
    });
  }

  /**
   * A promise that resolves when the markdown viewer is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Signal emitted when the content has been rendered.
   */
  get rendered(): ISignal<MarkdownViewer, void> {
    return this._rendered;
  }

  /**
   * Set URI fragment identifier.
   */
  setFragment(fragment: string): void {
    this._fragment = fragment;
    this.update();
  }

  /**
   * Set a config option for the markdown viewer.
   */
  setOption<K extends keyof MarkdownViewer.IConfig>(
    option: K,
    value: MarkdownViewer.IConfig[K]
  ): void {
    if (this._config[option] === value) {
      return;
    }
    this._config[option] = value;
    const { style } = this.renderer.node;
    switch (option) {
      case 'fontFamily':
        style.setProperty('font-family', value as string | null);
        break;
      case 'fontSize':
        style.setProperty('font-size', value ? value + 'px' : null);
        break;
      case 'hideFrontMatter':
        this.update();
        break;
      case 'lineHeight':
        style.setProperty('line-height', value ? value.toString() : null);
        break;
      case 'lineWidth': {
        const padding = value ? `calc(50% - ${(value as number) / 2}ch)` : null;
        style.setProperty('padding-left', padding);
        style.setProperty('padding-right', padding);
        break;
      }
      case 'renderTimeout':
        if (this._monitor) {
          this._monitor.timeout = value as number;
        }
        break;
      default:
        break;
    }
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
    if (this.context.isReady && !this.isDisposed) {
      void this._render();
      this._fragment = '';
    }
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
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
    const { context } = this;
    const { model } = context;
    const source = model.toString();
    const data: JSONObject = {};
    // If `hideFrontMatter`is true remove front matter.
    data[MIMETYPE] = this._config.hideFrontMatter
      ? Private.removeFrontMatter(source)
      : source;
    const mimeModel = new MimeModel({
      data,
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
      } else {
        this._rendered.emit();
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

  readonly context: DocumentRegistry.Context;
  readonly renderer: IRenderMime.IRenderer;
  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _config = { ...MarkdownViewer.defaultConfig };
  private _fragment = '';
  private _monitor: ActivityMonitor<DocumentRegistry.IModel, void> | null;
  private _ready = new PromiseDelegate<void>();
  private _isRendering = false;
  private _renderRequested = false;
  private _rendered = new Signal<MarkdownViewer, void>(this);
}

/**
 * The namespace for MarkdownViewer class statics.
 */
export namespace MarkdownViewer {
  /**
   * The options used to initialize a MarkdownViewer.
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
     * The application language translator.
     */
    translator?: ITranslator;
  }

  export interface IConfig {
    /**
     * User preferred font family for markdown viewer.
     */
    fontFamily: string | null;

    /**
     * User preferred size in pixel of the font used in markdown viewer.
     */
    fontSize: number | null;

    /**
     * User preferred text line height, as a multiplier of font size.
     */
    lineHeight: number | null;

    /**
     * User preferred text line width expressed in CSS ch units.
     */
    lineWidth: number | null;

    /**
     * Whether to hide the YAML front matter.
     */
    hideFrontMatter: boolean;

    /**
     * The render timeout.
     */
    renderTimeout: number;
  }

  /**
   * The default configuration options for an editor.
   */
  export const defaultConfig: MarkdownViewer.IConfig = {
    fontFamily: null,
    fontSize: null,
    lineHeight: null,
    lineWidth: null,
    hideFrontMatter: true,
    renderTimeout: 1000
  };
}

/**
 * A document widget for markdown content.
 */
export class MarkdownDocument extends DocumentWidget<MarkdownViewer> {
  setFragment(fragment: string): void {
    this.content.setFragment(fragment);
  }
}

/**
 * A widget factory for markdown viewers.
 */
export class MarkdownViewerFactory extends ABCWidgetFactory<MarkdownDocument> {
  /**
   * Construct a new markdown viewer widget factory.
   */
  constructor(options: MarkdownViewerFactory.IOptions) {
    super(Private.createRegistryOptions(options));
    this._fileType = options.primaryFileType;
    this._rendermime = options.rendermime;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): MarkdownDocument {
    const rendermime = this._rendermime.clone({
      resolver: context.urlResolver
    });
    const renderer = rendermime.createRenderer(MIMETYPE);
    const content = new MarkdownViewer({ context, renderer });
    content.title.icon = this._fileType?.icon;
    content.title.iconClass = this._fileType?.iconClass ?? '';
    content.title.iconLabel = this._fileType?.iconLabel ?? '';
    content.title.caption = this.label;
    const widget = new MarkdownDocument({ content, context });

    return widget;
  }

  private _fileType: DocumentRegistry.IFileType | undefined;
  private _rendermime: IRenderMimeRegistry;
}

/**
 * The namespace for MarkdownViewerFactory class statics.
 */
export namespace MarkdownViewerFactory {
  /**
   * The options used to initialize a MarkdownViewerFactory.
   */
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * The primary file type associated with the document.
     */
    primaryFileType: DocumentRegistry.IFileType | undefined;

    /**
     * The rendermime instance.
     */
    rendermime: IRenderMimeRegistry;
  }
}

/**
 * A namespace for markdown viewer widget private data.
 */
namespace Private {
  /**
   * Create the document registry options.
   */
  export function createRegistryOptions(
    options: MarkdownViewerFactory.IOptions
  ): DocumentRegistry.IWidgetFactoryOptions {
    return {
      ...options,
      readOnly: true
    } as DocumentRegistry.IWidgetFactoryOptions;
  }

  /**
   * Remove YAML front matter from source.
   */
  export function removeFrontMatter(source: string): string {
    const re = /^---\n[^]*?\n(---|...)\n/;
    const match = source.match(re);
    if (!match) {
      return source;
    }
    const { length } = match[0];
    return source.slice(length);
  }
}
