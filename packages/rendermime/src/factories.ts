/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import * as Renderers
  from './widgets';


/**
 * A mime renderer factory for raw html.
 */
export
const htmlRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/html'],
  createRenderer: options => new Renderers.RenderedHTML(options)
};


/**
 * A mime renderer factory for images.
 */
export
const imageRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  createRenderer: options => new Renderers.RenderedImage(options)
};


/**
 * A mime renderer factory for LaTeX.
 */
export
const latexRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/latex'],
  createRenderer: options => new Renderers.RenderedLatex(options)
};


/**
 * A mime renderer factory for Markdown.
 */
export
const markdownRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/markdown'],
  createRenderer: options => new Renderers.RenderedMarkdown(options)
};


/**
 * A mime renderer factory for text and jupyter console text data.
 */
export
const textRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/plain', 'application/vnd.jupyter.stdout', 'application/vnd.jupyter.stderr'],
  createRenderer: options => new Renderers.RenderedText(options)
};


/**
 * A mime renderer factory for javascript.
 */
export
const javaScriptRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['text/javascript', 'application/javascript'],
  createRenderer: options => new Renderers.RenderedJavaScript(options)
};


/**
 * A mime renderer factory for pdf.
 */
export
const pdfRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['application/pdf'],
  createRenderer: options => new Renderers.RenderedPDF(options)
};


/**
 * A mime renderer factory for svg.
 */
export
const svgRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['image/svg+xml'],
  createRenderer: options => new Renderers.RenderedSVG(options)
};


/**
 * The builtin factories provided by the package.
 */
export
const defaultRendererFactories: ReadonlyArray<IRenderMime.IRendererFactory> = [
  javaScriptRendererFactory,
  htmlRendererFactory,
  markdownRendererFactory,
  latexRendererFactory,
  svgRendererFactory,
  imageRendererFactory,
  pdfRendererFactory,
  textRendererFactory
];
