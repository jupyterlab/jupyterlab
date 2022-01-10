/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import * as renderers from './renderers';

/**
 * A common base class for mime renderers.
 */
export abstract class RenderedCommon
  extends Widget
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
    this.translator = options.translator ?? nullTranslator;
    this.latexTypesetter = options.latexTypesetter;
    this.markdownParser = options.markdownParser ?? null;
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
  readonly latexTypesetter: IRenderMime.ILatexTypesetter | null;

  /**
   * The markdownParser.
   */
  readonly markdownParser: IRenderMime.IMarkdownParser | null;

  /**
   * The translator.
   */
  readonly translator: ITranslator;

  /**
   * Highlights text fragment on the widget.
   *
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   *
   * #### Notes
   * This method may be called multiple times during the lifetime
   * of the widget to update it if and when new data is available.
   */
  renderHighlights(highlights: IRenderMime.IHighlight[]): Promise<void> {
    /* no-op */
    return Promise.resolve();
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   *
   * #### Notes
   * If the DOM node for this widget already has content, it is emptied
   * before rendering. Subclasses that do not want this behavior
   * (if, for instance, they are using DOM diffing), should override
   * this method and not call `super.renderModel()`.
   */
  async renderModel(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
    // TODO compare model against old model for early bail?

    // Empty any existing content in the node from previous renders
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }

    // Toggle the trusted class on the widget.
    this.toggleClass('jp-mod-trusted', model.trusted);

    // Render the actual content.
    await this.render(model, highlights);

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
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  abstract render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void>;

  /**
   * Set the URI fragment identifier.
   *
   * @param fragment - The URI fragment identifier.
   */
  protected setFragment(fragment: string): void {
    /* no-op */
  }
}

/**
 * Abstract class to render text with highlights
 */
export abstract class RenderedTextHighlightCommon extends RenderedCommon {
  /**
   * Construct a new rendered widget that can highlight text fragment.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.trusted = false;
    this.highlights = [];
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   *
   * ### Notes
   * It will clear the highlights. So `renderHighlights` needs to be
   * recalled.
   */
  render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
    this.originalSource = String(model.data[this.mimeType]);
    this.trusted = model.trusted;
    this.highlights = highlights ?? [];
    return this.rerender();
  }

  /**
   * Highlights text fragment on the widget.
   *
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  renderHighlights(highlights: IRenderMime.IHighlight[]): Promise<void> {
    // Empty any existing content in the node from previous renders
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }

    this.highlights = highlights;
    return typeof this.originalSource === 'string'
      ? this.rerender()
      : Promise.resolve();
  }

  /**
   * Create the source augmented with highlighted parts.
   *
   * @returns Modified source
   */
  protected highlight(): string {
    const src = this.originalSource;
    let lastEnd = 0;
    const finalSrc = this.highlights.reduce((agg, highlight) => {
      const start = highlight.position as number;
      const end = start + highlight.text.length;
      const newStep = `${agg}${src.slice(lastEnd, start)}${renderers.highlight(
        src.slice(start, end)
      )}`;
      lastEnd = end;
      return newStep;
    }, '');
    return `${finalSrc}${this.originalSource.slice(lastEnd)}`;
  }

  /**
   * Render the model with the highlights
   */
  protected abstract rerender(): Promise<void>;

  protected highlights: IRenderMime.IHighlight[];
  protected originalSource: string;
  protected trusted: boolean;
}

/**
 * A common base class for HTML mime renderers.
 */
export abstract class RenderedHTMLCommon extends RenderedTextHighlightCommon {
  /**
   * Construct a new rendered HTML common widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedHTMLCommon');
  }

  setFragment(fragment: string): void {
    let el;
    try {
      el = this.node.querySelector(
        fragment.startsWith('#')
          ? `#${CSS.escape(fragment.slice(1))}`
          : fragment
      );
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
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }

  /**
   * Render the model with the highlights
   */
  protected rerender(): Promise<void> {
    return renderers.renderHTML({
      host: this.node,
      source: this.highlight(),
      trusted: this.trusted,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler,
      shouldTypeset: this.isAttached,
      latexTypesetter: this.latexTypesetter,
      translator: this.translator
    });
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
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
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
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
    const metadata = model.metadata[this.mimeType] as
      | ReadonlyPartialJSONObject
      | undefined;
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
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this.latexTypesetter) {
      this.latexTypesetter.typeset(this.node);
    }
  }

  /**
   * Render the model with the highlights
   */
  protected rerender(): Promise<void> {
    return renderers.renderMarkdown({
      host: this.node,
      source: this.highlight(),
      trusted: this.trusted,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler,
      shouldTypeset: this.isAttached,
      latexTypesetter: this.latexTypesetter,
      markdownParser: this.markdownParser,
      translator: this.translator
    });
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
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
    const metadata = model.metadata[this.mimeType] as
      | ReadonlyJSONObject
      | undefined;
    return renderers.renderSVG({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted,
      unconfined: metadata && (metadata.unconfined as boolean | undefined),
      translator: this.translator
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
export class RenderedText extends RenderedTextHighlightCommon {
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
   * Render the model with the highlights
   */
  protected rerender(): Promise<void> {
    return renderers.renderText({
      host: this.node,
      sanitizer: this.sanitizer,
      source: this.highlight(),
      translator: this.translator
    });
  }
}

/**
 * A widget for displaying JavaScript output.
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
   * @param highlights - The highlights to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  render(
    model: IRenderMime.IMimeModel,
    highlights?: IRenderMime.IHighlight[]
  ): Promise<void> {
    const trans = this.translator.load('jupyterlab');

    return renderers.renderText({
      host: this.node,
      sanitizer: this.sanitizer,
      source: trans.__('JavaScript output is disabled in JupyterLab'),
      translator: this.translator
    });
  }
}
