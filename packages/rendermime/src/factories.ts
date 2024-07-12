/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import * as widgets from './widgets';

/**
 * A mime renderer factory for raw html.
 */
export const htmlRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/html'],
  defaultRank: 50,
  createRenderer: options => new widgets.RenderedHTML(options)
};

/**
 * A mime renderer factory for images.
 */
export const imageRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [
    'image/bmp',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ],
  defaultRank: 90,
  createRenderer: options => new widgets.RenderedImage(options)
};

/**
 * A mime renderer factory for LaTeX.
 */
export const latexRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/latex'],
  defaultRank: 70,
  createRenderer: options => new widgets.RenderedLatex(options)
};

/**
 * A mime renderer factory for Markdown.
 */
export const markdownRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/markdown'],
  defaultRank: 60,
  createRenderer: options => new widgets.RenderedMarkdown(options)
};

/**
 * A mime renderer factory for svg.
 */
export const svgRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['image/svg+xml'],
  defaultRank: 80,
  createRenderer: options => new widgets.RenderedSVG(options)
};

/**
 * A mime renderer factory for rendering stderr outputs
 */
export const errorRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['application/vnd.jupyter.stderr'],
  defaultRank: 110,
  createRenderer: options => new widgets.RenderedError(options)
};

/**
 * A mime renderer factory for plain and jupyter console text data.
 */
export const textRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/plain', 'application/vnd.jupyter.stdout'],
  defaultRank: 120,
  createRenderer: options => new widgets.RenderedText(options)
};

/**
 * A placeholder factory for rendered JavaScript.
 */
export const javaScriptRendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: ['text/javascript', 'application/javascript'],
  defaultRank: 110,
  createRenderer: options => new widgets.RenderedJavaScript(options)
};

/**
 * The standard factories provided by the rendermime package.
 */
export const standardRendererFactories: ReadonlyArray<IRenderMime.IRendererFactory> =
  [
    htmlRendererFactory,
    markdownRendererFactory,
    latexRendererFactory,
    svgRendererFactory,
    imageRendererFactory,
    javaScriptRendererFactory,
    errorRendererFactory,
    textRendererFactory
  ];
