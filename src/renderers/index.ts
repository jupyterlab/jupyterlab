// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  RenderMime
} from '../rendermime';

import {
  RenderedHTML, RenderedMarkdown, RenderedText, RenderedImage,
  RenderedJavascript, RenderedSVG, RenderedPDF, RenderedLatex
} from './widget';


/**
 * A renderer for raw html.
 */
export
class HTMLRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/html'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedHTML(options);
  }
}


/**
 * A renderer for `<img>` data.
 */
export
class ImageRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['image/png', 'image/jpeg', 'image/gif'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedImage(options);
  }
}


/**
 * A renderer for plain text and Jupyter console text data.
 */
export
class TextRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/plain', 'application/vnd.jupyter.console-text'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedText(options);
  }
}


/**
 * A renderer for raw `<script>` data.
 */
export
class JavascriptRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/javascript', 'application/javascript'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedJavascript(options);
  }
}


/**
 * A renderer for `<svg>` data.
 */
export
class SVGRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['image/svg+xml'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedSVG(options);
  }
}


/**
 * A renderer for PDF data.
 */
export
class PDFRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['application/pdf'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedPDF(options);
  }
}


/**
 * A renderer for LateX data.
 */
export
class LatexRenderer implements RenderMime.IRenderer  {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/latex'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Render the mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedLatex(options);
  }
}


/**
 * A renderer for Jupyter Markdown data.
 */
export
class MarkdownRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/markdown'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  isSanitizable(mimetype: string): boolean {
    return this.mimetypes.indexOf(mimetype) !== -1;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the mime bundle.
   */
  render(options: RenderMime.IRendererOptions<string>): Widget {
    return new RenderedMarkdown(options);
  }
}
