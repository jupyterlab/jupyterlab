// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import {
  requireMode, runMode, CodeMirrorEditor
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
  RenderMime, typeset, removeMath, replaceMath
} from '.';


/*
 * The class name added to common rendered HTML.
 */
export
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


// Support GitHub flavored Markdown, leave sanitizing to external library.
marked.setOptions({
  gfm: true,
  sanitize: false,
  tables: true,
  // breaks: true; We can't use GFM breaks as it causes problems with HTML tables
  langPrefix: `cm-s-${CodeMirrorEditor.DEFAULT_THEME} language-`,
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
    requireMode(lang).then(spec => {
      let el = document.createElement('div');
      if (!spec) {
          console.log(`No CodeMirror mode: ${lang}`);
          callback(null, code);
          return;
      }
      try {
        runMode(code, spec.mime, el);
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


/*
 * A widget for displaying any widget whoes representation is rendered HTML
 * */
export
class RenderedHTMLCommon extends Widget {
  /* Construct a new rendered HTML common widget.*/
  constructor(options: RenderMime.IRenderOptions) {
    super();
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
  constructor(options: RenderMime.IRenderOptions) {
    super(options);
    this.addClass(HTML_CLASS);
    let source = Private.getSource(options);
    if (!options.model.trusted) {
      source = options.sanitizer.sanitize(source);
    }
    Private.appendHtml(this.node, source);
    if (options.resolver) {
      this._urlResolved = Private.handleUrls(this.node, options.resolver,
                                             options.linkHandler);
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this._urlResolved) {
      this._urlResolved.then( () => { typeset(this.node); });
    } else {
      typeset(this.node);
    }
  }

  private _urlResolved: Promise<void> = null;
}


/**
 * A widget for displaying Markdown with embeded latex.
 */
export
class RenderedMarkdown extends RenderedHTMLCommon {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super(options);
    this.addClass(MARKDOWN_CLASS);
    let source = Private.getSource(options);
    let parts = removeMath(source);
    // Add the markdown content asynchronously.
    marked(parts['text'], (err: any, content: string) => {
      if (err) {
        console.error(err);
        return;
      }
      content = replaceMath(content, parts['math']);
      if (!options.model.trusted) {
        content = options.sanitizer.sanitize(content);
      }
      Private.appendHtml(this.node, content);
      if (options.resolver) {
        this._urlResolved = Private.handleUrls(this.node, options.resolver,
                                               options.linkHandler);
      }
      Private.headerAnchors(this.node);
      this.fit();
      this._rendered = true;
      if (this.isAttached) {
        if (this._urlResolved) {
          this._urlResolved.then(() => { typeset(this.node); });
        } else {
          typeset(this.node);
        }
      }
    });
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    if (this._rendered) {
      typeset(this.node);
    }
  }

  private _rendered = false;
  private _urlResolved : Promise<void> = null;
}


/**
 * A widget for displaying LaTeX output.
 */
export
class RenderedLatex extends Widget {
  /**
   * Construct a new latex widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let source = Private.getSource(options);
    this.node.textContent = source;
    this.addClass(LATEX_CLASS);
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
class RenderedImage extends Widget {
  /**
   * Construct a new rendered image widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let img = document.createElement('img');
    let source = Private.getSource(options);
    img.src = `data:${options.mimeType};base64,${source}`;
    let metadata = options.model.metadata.get(options.mimeType) as JSONObject;
    if (metadata) {
      let metaJSON = metadata as JSONObject;
      if (typeof metaJSON['height'] === 'number') {
        img.height = metaJSON['height'] as number;
      }
      if (typeof metaJSON['width'] === 'number') {
        img.width = metaJSON['width'] as number;
      }
    }
    this.node.appendChild(img);
    this.addClass(IMAGE_CLASS);
  }
}


/**
 * A widget for displaying rendered text.
 */
export
class RenderedText extends Widget {
  /**
   * Construct a new rendered text widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let source = Private.getSource(options);
    let data = escape_for_html(source);
    let pre = document.createElement('pre');
    pre.innerHTML = ansi_to_html(data);
    this.node.appendChild(pre);
    this.addClass(TEXT_CLASS);
    if (options.mimeType === 'application/vnd.jupyter.stderr') {
      this.addClass(ERROR_CLASS);
    }
  }
}


/**
 * A widget for displaying rendered JavaScript.
 */
export
class RenderedJavaScript extends Widget {
  /**
   * Construct a new rendered JavaScript widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let s = document.createElement('script');
    s.type = options.mimeType;
    let source = Private.getSource(options);
    s.textContent = source;
    this.node.appendChild(s);
    this.addClass(JAVASCRIPT_CLASS);
  }
}


/**
 * A widget for displaying rendered SVG content.
 */
export
class RenderedSVG extends Widget {
  /**
   * Construct a new rendered SVG widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let source = Private.getSource(options);
    this.node.innerHTML = source;
    let svgElement = this.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
    }
    if (options.resolver) {
      this._urlResolved = Private.handleUrls(this.node, options.resolver,
                                             options.linkHandler);
    }
    this.addClass(SVG_CLASS);
  }

  private _urlResolved: Promise<void> = null;
}


/**
 * A widget for displaying rendered PDF content.
 */
export
class RenderedPDF extends Widget {
  /**
   * Construct a new rendered PDF widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    let source = Private.getSource(options);
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = `data:application/pdf;base64,${source}`;
    this.node.appendChild(a);
    this.addClass(PDF_CLASS);
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
  function getSource(options: RenderMime.IRenderOptions): string {
    return String(options.model.data.get(options.mimeType));
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
  function handleUrls(node: HTMLElement, resolver: RenderMime.IResolver, linkHandler?: RenderMime.ILinkHandler): Promise<void> {
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
  function handleAttr(node: HTMLElement, name: 'src' | 'href', resolver: RenderMime.IResolver): Promise<void> {
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
    let headerNames = ['h1','h2','h3','h4','h5','h6'];
    for (let headerType of headerNames){
      let headers = node.getElementsByTagName(headerType);
      for (let i=0; i<headers.length; i++){
        let header = headers[i];
        header.id = header.innerHTML.replace(/ /g, '-');
        let anchor = document.createElement('a');
        anchor.target = '_self';
        anchor.textContent = '¶';
        anchor.href = '#'+ header.id;
        anchor.classList.add('jp-InternalAnchorLink');
        header.appendChild(anchor);
      };
    };
  }

  /**
   * Handle an anchor node.
   */
  function handleAnchor(anchor: HTMLAnchorElement, resolver: RenderMime.IResolver, linkHandler: RenderMime.ILinkHandler | null): Promise<void> {
    anchor.target = '_blank';
    let href = anchor.getAttribute('href');
    if (!href) {
      return Promise.resolve(void 0);
    }
    return resolver.resolveUrl(href).then(path => {
      if (linkHandler) {
        linkHandler.handleLink(anchor, path);
      }
      return resolver.getDownloadUrl(path);
    }).then(url => {
      anchor.href = url;
    });
  }
}
