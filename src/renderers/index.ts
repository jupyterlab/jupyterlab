// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import * as CodeMirror
  from 'codemirror';

import 'codemirror/addon/runmode/runmode';

import * as marked
  from 'marked';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  requireMode
} from '../codemirror';

import {
  RenderMime
} from '../rendermime';

import {
  typeset, removeMath, replaceMath
} from './latex';


/**
 * The class name added to rendered widgets.
 */
const RENDERED_CLASS = 'jp-Rendered';

/**
 * The class name added to rendered html widgets.
 */
const RENDERED_HTML = 'jp-mod-renderedHTML';


// Support GitHub flavored Markdown, leave sanitizing to external library.
marked.setOptions({
  gfm: true,
  sanitize: false,
  breaks: true,
  langPrefix: 'cm-s-default language-',
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
        CodeMirror.runMode(code, spec.mime, el);
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


/**
 * A widget for displaying HTML and rendering math.
 */
class HTMLWidget extends Widget {
  /**
   * Construct a new html widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    this.addClass(RENDERED_HTML);
    this.addClass(RENDERED_CLASS);
    let source = options.source;
    if (options.sanitizer) {
      source = options.sanitizer.sanitize(source);
    }
    appendHtml(this.node, source);
    if (options.resolver) {
      resolveUrls(this.node, options.resolver);
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying Markdown.
 */
class MarkdownWidget extends Widget {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    this.addClass(RENDERED_HTML);
    this.addClass(RENDERED_CLASS);
    let parts = removeMath(options.source);
    // Add the markdown content asynchronously.
    marked(parts['text'], (err, content) => {
      if (err) {
        console.error(err);
        return;
      }
      content = replaceMath(content, parts['math']);
      if (options.sanitizer) {
        content = options.sanitizer.sanitize(content);
      }
      appendHtml(this.node, content);
      if (options.resolver) {
        resolveUrls(this.node, options.resolver);
      }
      this.fit();
      this._rendered = true;
      if (this.isAttached) {
        typeset(this.node);
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
}


/**
 * A widget for displaying LaTeX output.
 */
class LatexWidget extends Widget {
  /**
   * Construct a new latex widget.
   */
  constructor(text: string) {
    super();
    this.node.textContent = text;
    this.addClass(RENDERED_CLASS);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


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
  render(options: RenderMime.IRenderOptions): Widget {
    return new HTMLWidget(options);
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
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let img = document.createElement('img');
    img.src = `data:${options.mimetype};base64,${options.source}`;
    w.node.appendChild(img);
    w.addClass(RENDERED_CLASS);
    return w;
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
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let data = escape_for_html(options.source);
    let pre = document.createElement('pre');
    pre.innerHTML = ansi_to_html(data);
    w.node.appendChild(pre);
    w.addClass(RENDERED_CLASS);
    return w;
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
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let s = document.createElement('script');
    s.type = options.mimetype;
    s.textContent = options.source;
    w.node.appendChild(s);
    w.addClass(RENDERED_CLASS);
    return w;
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
  render(options: RenderMime.IRenderOptions): Widget {
    let source = options.source;
    if (options.sanitizer) {
      source = options.sanitizer.sanitize(source);
    }
    let w = new Widget();
    w.node.innerHTML = source;
    let svgElement = w.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
    }
    if (options.resolver) {
      resolveUrls(w.node, options.resolver);
    }
    w.addClass(RENDERED_CLASS);
    return w;
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
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = 'data:application/pdf;base64,' + options.source;
    w.node.appendChild(a);
    w.addClass(RENDERED_CLASS);
    return w;
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
  render(options: RenderMime.IRenderOptions): Widget {
    return new LatexWidget(options.source);
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
  render(options: RenderMime.IRenderOptions): Widget {
    return new MarkdownWidget(options);
  }
}


/**
 * Resolve the relative urls in the image and anchor tags of a node tree.
 *
 * @param node - The head html element.
 *
 * @param resolver - A url resolver.
 */
export
function resolveUrls(node: HTMLElement, resolver: RenderMime.IResolver): void {
  let imgs = node.getElementsByTagName('img');
  for (let i = 0; i < imgs.length; i++) {
    let img = imgs[i];
    let source = img.getAttribute('src');
    if (source) {
      img.src = resolver.resolveUrl(source);
    }
  }
  let anchors = node.getElementsByTagName('a');
  for (let i = 0; i < anchors.length; i++) {
    let anchor = anchors[i];
    let href = anchor.getAttribute('href');
    if (href) {
      anchor.href = resolver.resolveUrl(href);
    }
  }
}


/**
 * Append trusted html to a node.
 */
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
