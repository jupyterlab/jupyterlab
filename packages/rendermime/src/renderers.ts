// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  Widget
} from '@phosphor/widgets';

import {
  RenderedHTML, RenderedMarkdown, RenderedText, RenderedImage,
  RenderedJavaScript, RenderedSVG, RenderedPDF, RenderedLatex
} from '.';


/**
 * A renderer for raw html.
 */
export
class HTMLRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['text/html'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedHTML(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return !options.model.trusted;
  }
}


/**
 * A renderer for `<img>` data.
 */
export
class ImageRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedImage(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for plain text and Jupyter console text data.
 */
export
class TextRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout',
               'application/vnd.jupyter.stderr'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedText(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for raw `<script>` data.
 */
export
class JavaScriptRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['text/javascript', 'application/javascript'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return (
      options.model.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedJavaScript(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for `<svg>` data.
 */
export
class SVGRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['image/svg+xml'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return (
      options.model.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedSVG(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for PDF data.
 */
export
class PDFRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['application/pdf'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return (
      options.model.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedPDF(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for LateX data.
 */
export
class LatexRenderer implements IRenderMime.IRenderer  {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['text/latex'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedLatex(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return false;
  }
}


/**
 * A renderer for Jupyter Markdown data.
 */
export
class MarkdownRenderer implements IRenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = ['text/markdown'];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: IRenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: IRenderMime.IRenderOptions): RenderMime.IReadyWidget {
    return new RenderedMarkdown(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRenderOptions): boolean {
    return !options.model.trusted;
  }
}
