/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  typeset
} from './latex';

import {
  RenderHelpers
} from './renderhelpers';


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
    this.node.dataset['mime-type'] = this.mimeType;
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

    // Set the trusted flag on the node.
    this.node.dataset['trusted'] = `${model.trusted}`;

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
    return RenderedHTML.renderHTML({
      node: this.node,
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
 * The namespace for the `RenderedHTML` class statics.
 */
export
namespace RenderedHTML {
  /**
   * The options for the `render` function.
   */
  export
  interface IRenderOptions {
    /**
     * The node to use as the host of the rendered HTML.
     */
    node: HTMLElement;

    /**
     * The HTML source to render.
     */
    source: string;

    /**
     * Whether the source is trusted.
     */
    trusted: boolean;

    /**
     * The html sanitizer.
     */
    sanitizer: ISanitizer;

    /**
     * An optional url resolver.
     */
    resolver: IRenderMime.IResolver | null;

    /**
     * An optional link handler.
     */
    linkHandler: IRenderMime.ILinkHandler | null;

    /**
     * Whether the node should be typeset.
     */
    shouldTypeset: boolean;
  }

  /**
   * Render HTML into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function render(options: renderHTML.IOptions): Promise<void> {
    // Unpack the options.
    let {
      node, source, trusted, sanitizer, resolver, linkHandler, shouldTypeset
    } = options;

    // Clear the content if there is no source.
    if (!source) {
      node.textContent = '';
      return Promise.resolve(undefined);
    }

    // Sanitize the source if it is not trusted.
    if (!trusted) {
      source = sanitizer.sanitize(source);
    }

    // Set the inner HTML to the source.
    node.innerHTML = source;

    // Patch the urls if a resolver is available.
    let promise: Promise<void>;
    if (resolver) {
      promise = Private.handleUrls(node, resolver, linkHandler);
    } else {
      promise = Promise.resolve(undefined);
    }

    // Return the final rendered promise.
    return promise.then(() => { if (shouldTypeset) { typeset(node); } });
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
    return RenderHelpers.renderMarkdown({
      node: this.node,
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
    return RenderHelpers.renderLatex({
      node: this.node,
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
    this.node.appendChild(document.createElement('img'));
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return RenderHelpers.renderImage({
      model,
      mimeType: this.mimeType,
      node: this.node.firstChild as HTMLImageElement
    });
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
    this.node.appendChild(document.createElement('pre'));
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return RenderHelpers.renderText({
      model,
      mimeType: this.mimeType,
      node: this.node.firstChild as HTMLElement
    });
  }
}


/**
 * A widget for displaying/executing JavaScript.
 */
export
class RenderedJavaScript extends RenderedCommon {
  /**
   * Construct a new rendered Javascript widget.
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
    return RenderHelpers.renderJavaScript({
      model,
      node: this.node,
      mimeType: this.mimeType
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
    return RenderHelpers.renderSVG({
      model,
      node: this.node,
      mimeType: this.mimeType,
      resolver: this.resolver,
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
    return RenderHelpers.renderPDF({
      model,
      node: this.node,
      mimeType: this.mimeType
    });
  }
}


/**
 * The namespace for module implementation details.
 */
namespace Private {
  /**
   * Test whether two mime models are equivalent.
   */
  export
  function equalModels(a: IRenderMime.IMimeModel, b: IRenderMime.IMimeModel): boolean {
    if (a === b) {
      return true;
    }
    if (a.trusted !== b.trusted) {
      return false;
    }
    if (a.data !== b.data) {
      return false;
    }
    if (a.metadata !== b.metadata) {
      return false;
    }
    return true;
  }
}
