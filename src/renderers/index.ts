// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/addon/runmode/runmode';

import * as marked
  from 'marked';

import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import {
  Widget
} from 'phosphor-widget';

import {
  Message
} from 'phosphor-messaging';

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
const RENDERED_HTML = 'jp-Rendered-html';


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
        CodeMirror.runMode(code, spec, el);
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
  constructor(html: string) {
    super();
    this.addClass(RENDERED_HTML);
    this.addClass(RENDERED_CLASS);
    try {
      let range = document.createRange();
      this.node.appendChild(range.createContextualFragment(html));
    } catch (error) {
      console.warn('Environment does not support Range ' +
                   'createContextualFragment, falling back on innerHTML');
      this.node.innerHTML = html;
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
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    return new HTMLWidget(data);
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
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let img = document.createElement('img');
    img.src = `data:${mimetype};base64,${data}`;
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
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    data = escape_for_html(data);
    return `<pre>${ansi_to_html(data)}</pre>`;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    w.node.innerHTML = data;
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
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let s = document.createElement('script');
    s.type = mimetype;
    s.textContent = data;
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
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    w.node.innerHTML = data;
    let svgElement = w.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
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
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = 'data:application/pdf;base64,' + data;
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
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): string {
    return data;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    return new LatexWidget(data);
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
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Transform the input bundle.
   */
  transform(mimetype: string, data: string): Promise<string> {
    let parts = removeMath(data);
    return new Promise<string>((resolve, reject) => {
      marked(parts['text'], (err, content) => {
        if (err) {
          reject(err);
        }
        resolve(replaceMath(content, parts['math']));
      });
    });
  }

  /**
   * Render the transformed mime bundle.
   */
  render(mimetype: string, data: string): Widget {
    return new HTMLWidget(data);
  }
}
