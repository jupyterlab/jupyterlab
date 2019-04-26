/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { PromiseDelegate, ReadonlyJSONObject } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import * as renderers from './renderers';

/**
 * A common base class for mime renderers.
 */
export abstract class RenderedCommon extends Widget
  implements IRenderMime.IRenderer {
  /**
   * Construct a new rendered common widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.mimeType = options.mimeType;
    this.sanitizer = options.sanitizer;
    this.resolver = options.resolver;
    this.linkHandler = options.linkHandler;
    this.latexTypesetter = options.latexTypesetter;
    this.node.dataset['mimeType'] = this.mimeType;
  }

  /**
   * The mimetype being rendered.
   */
  readonly mimeType: string;

  /**
   * The sanitizer used to sanitize untrusted html inputs.
   */
  readonly sanitizer: IRenderMime.ISanitizer;

  /**
   * The resolver object.
   */
  readonly resolver: IRenderMime.IResolver | null;

  /**
   * The link handler.
   */
  readonly linkHandler: IRenderMime.ILinkHandler | null;

  /**
   * The latexTypesetter.
   */
  readonly latexTypesetter: IRenderMime.ILatexTypesetter;

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // TODO compare model against old model for early bail?

    // Toggle the trusted class on the widget.
    this.toggleClass('jp-mod-trusted', model.trusted);

    // Render the actual content.
    await this.render(model);

    // Handle the fragment identifier if given.
    const { fragment } = model.metadata;
    if (fragment) {
      this.setFragment(fragment as string);
    }
  }

  /**
   * Render the mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  abstract render(model: IRenderMime.IMimeModel): Promise<void>;

  /**
   * Set the URI fragment identifier.
   *
   * @param fragment - The URI fragment identifier.
   */
  protected setFragment(fragment: string) {
    /* no-op */
  }
}

/**
 * A common base class for HTML mime renderers.
 */
export abstract class RenderedHTMLCommon extends RenderedCommon {
  /**
   * Construct a new rendered HTML common widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedHTMLCommon');
  }

  setFragment(fragment: string) {
    let el;
    try {
      el = this.node.querySelector(fragment);
    } catch (error) {
      console.warn('Unable to set URI fragment identifier.', error);
    }
    if (el) {
      el.scrollIntoView();
    }
  }
}

/**
 * A mime renderer for displaying HTML and math.
 */
export class RenderedHTML extends RenderedHTMLCommon {
  /**
   * Construct a new rendered HTML widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedHTML');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderHTML({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler,
      shouldTypeset: this.isAttached,
      latexTypesetter: this.latexTypesetter
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }
}

/**
 * A mime renderer for displaying LaTeX output.
 */
export class RenderedLatex extends RenderedCommon {
  /**
   * Construct a new rendered LaTeX widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedLatex');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderLatex({
      host: this.node,
      source: String(model.data[this.mimeType]),
      shouldTypeset: this.isAttached,
      latexTypesetter: this.latexTypesetter
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }
}

/**
 * A mime renderer for displaying images.
 */
export class RenderedImage extends RenderedCommon {
  /**
   * Construct a new rendered image widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedImage');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let metadata = model.metadata[this.mimeType] as ReadonlyJSONObject;
    return renderers.renderImage({
      host: this.node,
      mimeType: this.mimeType,
      source: String(model.data[this.mimeType]),
      width: metadata && (metadata.width as number | undefined),
      height: metadata && (metadata.height as number | undefined),
      needsBackground: model.metadata['needs_background'] as string | undefined,
      unconfined: metadata && (metadata.unconfined as boolean | undefined)
    });
  }
}

/**
 * A mime renderer for displaying Markdown with embedded latex.
 */
export class RenderedMarkdown extends RenderedHTMLCommon {
  /**
   * Construct a new rendered markdown widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedMarkdown');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderMarkdown({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler,
      shouldTypeset: this.isAttached,
      latexTypesetter: this.latexTypesetter
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }
}

/**
 * A widget for displaying SVG content.
 */
export class RenderedSVG extends RenderedCommon {
  /**
   * Construct a new rendered SVG widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedSVG');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let metadata = model.metadata[this.mimeType] as ReadonlyJSONObject;
    return renderers.renderSVG({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted,
      unconfined: metadata && (metadata.unconfined as boolean | undefined)
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }
}

/**
 * A widget for displaying plain text and console text.
 */
export class RenderedText extends RenderedCommon {
  /**
   * Construct a new rendered text widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedText');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderText({
      host: this.node,
      source: String(model.data[this.mimeType])
    });
  }
}

/**
 * A widget for displaying deprecated JavaScript output.
 */
export class RenderedJavaScript extends RenderedCommon {
  /**
   * Construct a new rendered text widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedJavaScript');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderText({
      host: this.node,
      source: 'JavaScript output is disabled in JupyterLab'
    });
  }
}

/**
 * A class for rendering a PDF document.
 */
export class RenderedPDF extends RenderedCommon {
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-PDFContainer');
    // We put the object in an iframe, which seems to have a better chance
    // of retaining its scroll position upon tab focusing, moving around etc.
    const iframe = document.createElement('iframe');
    this.node.appendChild(iframe);
    // The iframe content window is not available until the onload event.
    iframe.onload = () => {
      const body = iframe.contentWindow.document.createElement('body');
      body.style.margin = '0px';
      iframe.contentWindow.document.body = body;
      this._object = iframe.contentWindow.document.createElement('object');
      this._object.type = 'application/pdf';
      this._object.width = '100%';
      this._object.height = '100%';
      this._object.className = 'jp-PDFViewer';
      body.appendChild(this._object);
      this._ready.resolve(void 0);
    };
  }

  /**
   * Render PDF into this widget's node.
   */
  async render(model: IRenderMime.IMimeModel): Promise<void> {
    await this._ready.promise;
    const source = model.data['application/pdf'] as string;
    // If there is no data, or if the string has not changed, do nothing.
    if (
      !source ||
      (source.length === this._base64.length && source === this._base64)
    ) {
      return Promise.resolve(void 0);
    }
    this._base64 = source;

    if (this._disposable) {
      this._disposable.dispose();
    }
    this._disposable = await renderers.renderPDF({
      host: this._object,
      source
    });

    return;
  }

  protected setFragment(fragment: string): void {
    if (!this._object.data) {
      return;
    }
    this._object.data = `${this._object.data.split('#')[0]}${fragment}`;
  }

  /**
   * Dispose of the resources held by the pdf widget.
   */
  dispose() {
    this._disposable.dispose();
    this._base64 = '';
    super.dispose();
  }

  private _disposable: IDisposable | null = null;
  private _base64 = '';
  private _object: HTMLObjectElement;
  private _ready = new PromiseDelegate<void>();
}
