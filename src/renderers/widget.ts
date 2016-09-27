// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import * as CodeMirror
  from 'codemirror';

import 'codemirror/addon/runmode/runmode';

import {
  requireMode
} from '../codemirror';

import {
  DEFAULT_CODEMIRROR_THEME
} from '../codemirror/widget';

import * as marked
  from 'marked';

import {
  RenderMime
} from '../rendermime';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  typeset, removeMath, replaceMath
} from './latex';


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
  langPrefix: `cm-s-${DEFAULT_CODEMIRROR_THEME} language-`,
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


/*
 * A widget for displaying any widget whoes representation is rendered HTML
 * */
export
class RenderedHTMLCommon extends Widget {
  /* Construct a new rendered HTML common widget.*/
  constructor(options: RenderMime.IRenderOptions<string>) {
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
  constructor(options: RenderMime.IRenderOptions<string>) {
    super(options);
    this.addClass(HTML_CLASS);
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
 * A widget for displaying Markdown with embeded latex.
 */
export
class RenderedMarkdown extends RenderedHTMLCommon {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: RenderMime.IRenderOptions<string>) {
    super(options);
    this.addClass(MARKDOWN_CLASS);
    let parts = removeMath(options.source);
    // Add the markdown content asynchronously.
    marked(parts['text'], (err: any, content: string) => {
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
export
class RenderedLatex extends Widget {
  /**
   * Construct a new latex widget.
   */
  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    this.node.textContent = options.source;
    this.addClass(LATEX_CLASS);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


export
class RenderedImage extends Widget {

  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    let img = document.createElement('img');
    img.src = `data:${options.mimetype};base64,${options.source}`;
    this.node.appendChild(img);
    this.addClass(IMAGE_CLASS);
  }
}


export
class RenderedText extends Widget {

  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    let data = escape_for_html(options.source as string);
    let pre = document.createElement('pre');
    pre.innerHTML = ansi_to_html(data);
    this.node.appendChild(pre);
    this.addClass(TEXT_CLASS);
  }
}


export
class RenderedJavascript extends Widget {

  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    let s = document.createElement('script');
    s.type = options.mimetype;
    s.textContent = options.source;
    this.node.appendChild(s);
    this.addClass(JAVASCRIPT_CLASS);
  }
}


export
class RenderedSVG extends Widget {

  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    let source = options.source;
    if (options.sanitizer) {
      source = options.sanitizer.sanitize(source);
    }
    this.node.innerHTML = source;
    let svgElement = this.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
    }
    if (options.resolver) {
      resolveUrls(this.node, options.resolver);
    }
    this.addClass(SVG_CLASS);
  }
}


export
class RenderedPDF extends Widget {

  constructor(options: RenderMime.IRenderOptions<string>) {
    super();
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = 'data:application/pdf;base64,' + options.source;
    this.node.appendChild(a);
    this.addClass(PDF_CLASS);
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
