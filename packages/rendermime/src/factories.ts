/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import * as widgets
  from './widgets';


/**
 * A mime renderer factory for raw html.
 */
export
const htmlRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/html'],
  createRenderer: options => new widgets.RenderedHTML(options)
};


/**
 * A mime renderer factory for images.
 */
export
const imageRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  createRenderer: options => new widgets.RenderedImage(options)
};


/**
 * A mime renderer factory for LaTeX.
 */
export
const latexRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/latex'],
  createRenderer: options => new widgets.RenderedLatex(options)
};


/**
 * A mime renderer factory for Markdown.
 */
export
const markdownRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/markdown'],
  createRenderer: options => new widgets.RenderedMarkdown(options)
};


/**
 * A mime renderer factory for svg.
 */
export
const svgRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['image/svg+xml'],
  createRenderer: options => new widgets.RenderedSVG(options)
};


/**
 * A mime renderer factory for plain and jupyter console text data.
 */
export
const textRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/plain', 'application/vnd.jupyter.stdout', 'application/vnd.jupyter.stderr'],
  createRenderer: options => new widgets.RenderedText(options)
};


/**
 * A placeholder factory for deprecated rendered JavaScript.
 */
export
const javaScriptRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['text/javascript', 'application/javascript'],
  createRenderer: options => new widgets.RenderedJavaScript(options)
};


/**
 * The builtin factories provided by the rendermime package.
 */
export
const defaultRendererFactories: ReadonlyArray<IRenderMime.IRendererFactory> = [
  htmlRendererFactory,
  markdownRendererFactory,
  latexRendererFactory,
  svgRendererFactory,
  imageRendererFactory,
  javaScriptRendererFactory,
  textRendererFactory
];
