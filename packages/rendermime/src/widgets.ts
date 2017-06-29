// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import {
  Mode, CodeMirrorEditor
} from '@jupyterlab/codemirror';

import * as marked
  from 'marked';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  typeset, removeMath, replaceMath
} from '.';


/*
 * The class name added to common rendered HTML.
 */
const HTML_COMMON_CLASS = 'jp-RenderedHTMLCommon';

/*
 * The class name added to rendered HTML.
 */
const HTML_CLASS = 'jp-RenderedHTML';

/*
 * The class name added to rendered markdown.
 */
const MARKDOWN_CLASS = 'jp-RenderedMarkdown';

/*
 * The class name added to rendered Latex.
 */
const LATEX_CLASS = 'jp-RenderedLatex';

/*
 * The class name added to rendered images.
 */
const IMAGE_CLASS = 'jp-RenderedImage';

/*
 * The class name added to rendered text.
 */
const TEXT_CLASS = 'jp-RenderedText';

/**
 * The class name added to an error output.
 */
const ERROR_CLASS = 'jp-mod-error';

/*
 * The class name added to rendered javascript.
 */
const JAVASCRIPT_CLASS = 'jp-RenderedJavascript';

/*
 * The class name added to rendered SVG.
 */
const SVG_CLASS = 'jp-RenderedSVG';

/*
 * The class name added to rendered PDF.
 */
const PDF_CLASS = 'jp-RenderedPDF';


/*
 * A widget for displaying any widget whoes representation is rendered HTML.
 */
export
abstract class RenderedCommon extends Widget implements IRenderMime.IRendererWidget {
  /* Construct a new rendered HTML common widget.*/
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.mimeType = options.mimeType;
    this.sanitizer = options.sanitizer;
    this.resolver = options.resolver;
    this.linkHandler = options.linkHandler;
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
   * The link handler.
   */
  readonly linkHandler: IRenderMime.ILinkHandler;

  /**
   * The resolver object.
   */
  readonly resolver: IRenderMime.IResolver | null;

  /**
   * Render a mime model.
   */
  abstract render(model: IRenderMime.IMimeModel): Promise<void>;
}


/*
 * A widget for displaying any widget whoes representation is rendered HTML.
 * */
export
abstract class RenderedHTMLCommon extends RenderedCommon {
  /* Construct a new rendered HTML common widget.*/
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass(HTML_COMMON_CLASS);
  }
}


/**
 * A widget for displaying HTML and rendering math.
 */
export
class RenderedHTML extends RenderedHTMLCommon {
  /**
   * Construct a new html widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass(HTML_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    if (!model.trusted) {
      source = this.sanitizer.sanitize(source);
    }
    Private.appendHtml(this.node, source);
    if (this.resolver) {
      return Private.handleUrls(
        this.node, this.resolver, this.linkHandler
      ).then(() => {
        if (this.isAttached) {
          typeset(this.node);
        }
      });
    }
    if (this.isAttached) {
      typeset(this.node);
    }
    return Promise.resolve(void 0);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying Markdown with embeded latex.
 */
export
class RenderedMarkdown extends RenderedHTMLCommon {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass(MARKDOWN_CLASS);

    // Initialize the marked library if necessary.
    Private.initializeMarked();
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let source = Private.getSource(model, this.mimeType);
      let parts = removeMath(source);
      // Add the markdown content asynchronously.
      marked(parts['text'], (err: any, content: string) => {
        if (err) {
          console.error(err);
          return;
        }
        content = replaceMath(content, parts['math']);
        if (!model.trusted) {
          content = this.sanitizer.sanitize(content);
        }
        Private.appendHtml(this.node, content);
        Private.headerAnchors(this.node);
        this.fit();
        if (this.resolver) {
          Private.handleUrls(
            this.node, this.resolver, this.linkHandler
          ).then(() => {
            if (this.isAttached) {
              typeset(this.node);
            }
            resolve(void 0);
          });
        } else {
          if (this.isAttached) {
            typeset(this.node);
          }
          resolve(void 0);
        }
      });
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
 * A widget for displaying LaTeX output.
 */
export
class RenderedLatex extends RenderedCommon {
  /**
   * Construct a new latex widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass(LATEX_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    this.node.textContent = source;
    if (this.isAttached) {
      typeset(this.node);
    }
    return Promise.resolve(void 0);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying rendered images.
 */
export
class RenderedImage extends RenderedCommon {
  /**
   * Construct a new rendered image widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    let img = document.createElement('img');
    this.node.appendChild(img);
    this.addClass(IMAGE_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    let img = this.node.firstChild as HTMLImageElement;
    img.src = `data:${this.mimeType};base64,${source}`;
    let metadata = model.metadata.get(this.mimeType) as JSONObject;
    if (metadata) {
      let metaJSON = metadata as JSONObject;
      if (typeof metaJSON['height'] === 'number') {
        img.height = metaJSON['height'] as number;
      }
      if (typeof metaJSON['width'] === 'number') {
        img.width = metaJSON['width'] as number;
      }
    }
    return Promise.resolve(void 0);
  }
}


/**
 * A widget for displaying rendered text.
 */
export
class RenderedText extends RenderedCommon {
  /**
   * Construct a new rendered text widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    let pre = document.createElement('pre');
    this.node.appendChild(pre);
    this.addClass(TEXT_CLASS);
    if (this.mimeType === 'application/vnd.jupyter.stderr') {
      this.addClass(ERROR_CLASS);
    }
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    let data = escape_for_html(source);
    let pre = this.node.firstChild as HTMLPreElement;
    pre.innerHTML = ansi_to_html(data, {use_classes: true});
    return Promise.resolve(void 0);
  }
}


/**
 * A widget for displaying rendered JavaScript.
 */
export
class RenderedJavaScript extends RenderedCommon {
  /**
   * Construct a new rendered JavaScript widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    let s = document.createElement('script');
    s.type = options.mimeType;
    this.node.appendChild(s);
    this.addClass(JAVASCRIPT_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let s = this.node.firstChild as HTMLScriptElement;
    let source = Private.getSource(model, this.mimeType);
    s.textContent = source;
    return Promise.resolve(void 0);
  }
}


/**
 * A widget for displaying rendered SVG content.
 */
export
class RenderedSVG extends RenderedCommon {
  /**
   * Construct a new rendered SVG widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass(SVG_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    this.node.innerHTML = source;
    let svgElement = this.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      let msg = 'SVGRender: Error: Failed to create <svg> element';
      return Promise.reject(new Error(msg));
    }
    if (this.resolver) {
      return Private.handleUrls(
        this.node, this.resolver, this.linkHandler
      );
    }
    return Promise.resolve(void 0);
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
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    this.node.appendChild(a);
    this.addClass(PDF_CLASS);
  }

  /**
   * Render a mime model.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    let source = Private.getSource(model, this.mimeType);
    let a = this.node.firstChild as HTMLAnchorElement;
    a.href = `data:application/pdf;base64,${source}`;
    return Promise.resolve(void 0);
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Extract the source text from render options.
   */
  export
  function getSource(model: IRenderMime.IMimeModel, mimeType: string): string {
    return String(model.data.get(mimeType));
  }

  /**
   * Append trusted html to a node.
   */
  export
  function appendHtml(node: HTMLElement, html: string): void {
    try {
      let range = document.createRange();
      node.appendChild(range.createContextualFragment(html));
    } catch (error) {
      console.warn('Environment does not support Range ' +
                   'createContextualFragment, falling back on innerHTML');
      node.innerHTML = html;
    }
  }

  /**
   * Resolve the relative urls in element `src` and `href` attributes.
   *
   * @param node - The head html element.
   *
   * @param resolver - A url resolver.
   *
   * @param linkHandler - An optional link handler for nodes.
   *
   * @returns a promise fulfilled when the relative urls have been resolved.
   */
  export
  function handleUrls(node: HTMLElement, resolver: IRenderMime.IResolver, linkHandler?: IRenderMime.ILinkHandler): Promise<void> {
    let promises: Promise<void>[] = [];
    // Handle HTML Elements with src attributes.
    let nodes = node.querySelectorAll('*[src]');
    for (let i = 0; i < nodes.length; i++) {
      promises.push(handleAttr(nodes[i] as HTMLElement, 'src', resolver));
    }
    let anchors = node.getElementsByTagName('a');
    for (let i = 0; i < anchors.length; i++) {
      promises.push(handleAnchor(anchors[i], resolver, linkHandler || null));
    }
    let links = node.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      promises.push(handleAttr(links[i], 'href', resolver));
    }
    return Promise.all(promises).then(() => { return void 0; });
  }

  /**
   * Handle a node with a `src` or `href` attribute.
   */
  function handleAttr(node: HTMLElement, name: 'src' | 'href', resolver: IRenderMime.IResolver): Promise<void> {
    let source = node.getAttribute(name);
    if (!source) {
      return Promise.resolve(void 0);
    }
    node.setAttribute(name, '');
    return resolver.resolveUrl(source).then(path => {
      return resolver.getDownloadUrl(path);
    }).then(url => {
      node.setAttribute(name, url);
    });
  }

  /**
   * Apply ids to headers.
   */
  export
  function headerAnchors(node: HTMLElement): void {
    let headerNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    for (let headerType of headerNames){
      let headers = node.getElementsByTagName(headerType);
      for (let i=0; i < headers.length; i++) {
        let header = headers[i];
        header.id = header.innerHTML.replace(/ /g, '-');
        let anchor = document.createElement('a');
        anchor.target = '_self';
        anchor.textContent = '¶';
        anchor.href = '#' + header.id;
        anchor.classList.add('jp-InternalAnchorLink');
        header.appendChild(anchor);
      }
    }
  }

  /**
   * Handle an anchor node.
   */
  function handleAnchor(anchor: HTMLAnchorElement, resolver: IRenderMime.IResolver, linkHandler: IRenderMime.ILinkHandler | null): Promise<void> {
    anchor.target = '_blank';
    // Get the link path without the location prepended.
    // (e.g. "./foo.md#Header 1" vs "http://localhost:8888/foo.md#Header 1")
    let href = anchor.getAttribute('href');
    // Bail if it is not a file-like url.
    if (!href || href.indexOf('://') !== -1 && href.indexOf('//') === 0) {
      return Promise.resolve(void 0);
    }
    // Remove the hash until we can handle it.
    let hash = anchor.hash;
    if (hash) {
      // Handle internal link in the file.
      if (hash === href) {
        anchor.target = '_self';
        return Promise.resolve(void 0);
      }
      // For external links, remove the hash until we have hash handling.
      href = href.replace(hash, '');
    }
    // Get the appropriate file path.
    return resolver.resolveUrl(href).then(path => {
      // Handle the click override.
      if (linkHandler && URLExt.isLocal(path)) {
        linkHandler.handleLink(anchor, path);
      }
      // Get the appropriate file download path.
      return resolver.getDownloadUrl(path);
    }).then(url => {
      // Set the visible anchor.
      anchor.href = url + hash;
    });
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  let initialized = false;

  /**
   * Support GitHub flavored Markdown, leave sanitizing to external library.
   */
  export
  function initializeMarked(): void {
    if (initialized) {
      return;
    }
    initialized = true;
    marked.setOptions({
      gfm: true,
      sanitize: false,
      tables: true,
      // breaks: true; We can't use GFM breaks as it causes problems with tables
      langPrefix: `cm-s-${CodeMirrorEditor.defaultConfig.theme} language-`,
      highlight: (code, lang, callback) => {
        if (!lang) {
            // no language, no highlight
            if (callback) {
                callback(null, code);
                return;
            } else {
                return code;
            }
        }
        Mode.ensure(lang).then(spec => {
          let el = document.createElement('div');
          if (!spec) {
              console.log(`No CodeMirror mode: ${lang}`);
              callback(null, code);
              return;
          }
          try {
            Mode.run(code, spec.mime, el);
            callback(null, el.innerHTML);
          } catch (err) {
            console.log(`Failed to highlight ${lang} code`, err);
            callback(err, code);
          }
        }).catch(err => {
          console.log(`No CodeMirror mode: ${lang}`);
          console.log(`Require CodeMirror mode error: ${err}`);
          callback(null, code);
        });
      }
    });
  }
}
