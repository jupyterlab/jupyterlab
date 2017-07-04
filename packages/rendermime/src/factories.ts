// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  RenderedHTML, RenderedMarkdown, RenderedText, RenderedImage,
  RenderedJavaScript, RenderedSVG, RenderedPDF, RenderedLatex
} from '.';


/**
 * A renderer for raw html.
 */
export
class HTMLRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['text/html'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedHTML(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return !options.trusted;
  }
}


/**
 * A renderer factory for `<img>` data.
 */
export
class ImageRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedImage(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for plain text and Jupyter console text data.
 */
export
class TextRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout',
               'application/vnd.jupyter.stderr'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedText(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for raw `<script>` data.
 */
export
class JavaScriptRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['text/javascript', 'application/javascript'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return (
      options.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedJavaScript(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for `<svg>` data.
 */
export
class SVGRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['image/svg+xml'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return (
      options.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedSVG(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for PDF data.
 */
export
class PDFRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['application/pdf'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return (
      options.trusted &&
      this.mimeTypes.indexOf(options.mimeType) !== -1
    );
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedPDF(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for LateX data.
 */
export
class LatexRendererFactory implements IRenderMime.IRendererFactory  {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['text/latex'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedLatex(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return false;
  }
}


/**
 * A renderer factory for Jupyter Markdown data.
 */
export
class MarkdownRendererFactory implements IRenderMime.IRendererFactory {
  /**
   * The mimeTypes this factory accepts.
   */
  mimeTypes = ['text/markdown'];

  /**
   * Whether the factory can create a renderer given the options.
   */
  canCreateRenderer(options: IRenderMime.IRendererOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Create a renderer the transformed mime data.
   *
   * @param options - The options used to render the data.
   */
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new RenderedMarkdown(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: IRenderMime.IRendererOptions): boolean {
    return !options.trusted;
  }
}
