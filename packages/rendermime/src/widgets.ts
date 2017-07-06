/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  typeset
} from './latex';

import * as renderers
  from './renderers';


/**
 * A common base class for mime renderers.
 */
export
abstract class RenderedCommon extends Widget implements IRenderMime.IRenderer {
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
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // TODO compare model against old model for early bail?

    // Toggle the trusted class on the widget.
    this.toggleClass('jp-mod-trusted', model.trusted);

    // Render the actual content.
    return this.render(model);
  }

  /**
   * Render the mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  abstract render(model: IRenderMime.IMimeModel): Promise<void>;
}


/**
 * A common base class for HTML mime renderers.
 */
export
abstract class RenderedHTMLCommon extends RenderedCommon {
  /**
   * Construct a new rendered HTML common widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedHTMLCommon');
  }
}


/**
 * A mime renderer for displaying HTML and math.
 */
export
class RenderedHTML extends RenderedHTMLCommon {
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
      shouldTypeset: this.isAttached
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A mime renderer for displaying LaTeX output.
 */
export
class RenderedLatex extends RenderedCommon {
  /**
   * Construct a new rendered Latex widget.
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
      shouldTypeset: this.isAttached
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A mime renderer for displaying images.
 */
export
class RenderedImage extends RenderedCommon {
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
      width: metadata && metadata.width as number | undefined,
      height: metadata && metadata.height as number | undefined,
      unconfined: metadata && metadata.unconfined as boolean | undefined
    });
  }
}


/**
 * A mime renderer for displaying Markdown with embeded latex.
 */
export
class RenderedMarkdown extends RenderedHTMLCommon {
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
      shouldTypeset: this.isAttached
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying rendered PDF content.
 */
export
class RenderedPDF extends RenderedCommon {
  /**
   * Construct a new rendered PDF widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedPDF');
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderers.renderPDF({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted
    });
  }
}


/**
 * A widget for displaying SVG content.
 */
export
class RenderedSVG extends RenderedCommon {
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
      resolver: this.resolver,
      linkHandler: this.linkHandler,
      shouldTypeset: this.isAttached,
      unconfined: metadata && metadata.unconfined as boolean | undefined
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying plain text and console text.
 */
export
class RenderedText extends RenderedCommon {
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
