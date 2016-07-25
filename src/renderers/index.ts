// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/addon/runmode/runmode';

import * as marked
  from 'marked';

import {
  escape_for_html, ansi_to_html
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
  IRenderer
} from '../rendermime';

import {
  defaultSanitizer
} from '../sanitizer';

import {
  typeset, removeMath, replaceMath
} from './latex';



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
export
class HTMLWidget extends Widget {
  constructor(html: string) {
    super();
    this._html = html;
  }

  /**
   * The html string associated with the widget.
   */
  get html(): string {
    return this._html;
  }
  set html(value: string) {
    if (value === this._html) {
      return;
    }
    this._html = value;
    this.update();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  onUpdateRequest(msg: Message): void {
    if (!this.isAttached || !this._html) {
      return;
    }
    try {
      let range = document.createRange();
      this.node.appendChild(range.createContextualFragment(this._html));
    } catch (error) {
      console.warn('Environment does not support Range ' +
                   'createContextualFragment, falling back on innerHTML');
      this.node.innerHTML = this._html;
    }
    typeset(this.node);
  }

  private _html = '';
}


/**
 * A renderer for raw html.
 */
export
class HTMLRenderer implements IRenderer<Widget> {
  mimetypes = ['text/html'];

  render(mimetype: string, data: string): Widget {
    return new HTMLWidget(data);
  }
}


/**
 * A renderer for `<img>` data.
 */
export
class ImageRenderer implements IRenderer<Widget> {
  mimetypes = ['image/png', 'image/jpeg', 'image/gif'];

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let img = document.createElement('img');
    img.src = `data:${mimetype};base64,${data}`;
    w.node.appendChild(img);
    return w;
  }
}


/**
 * A renderer for plain text and Jupyter console text data.
 */
export
class TextRenderer implements IRenderer<Widget> {
  mimetypes = ['text/plain', 'application/vnd.jupyter.console-text'];

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let el = document.createElement('pre');
    let esc = escape_for_html(data);
    el.innerHTML = ansi_to_html(esc);
    w.node.appendChild(el);
    return w;
  }
}


/**
 * A renderer for raw `<script>` data.
 */
export
class JavascriptRenderer implements IRenderer<Widget> {
  mimetypes = ['text/javascript', 'application/javascript'];

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let s = document.createElement('script');
    s.type = mimetype;
    s.textContent = data;
    w.node.appendChild(s);
    return w;
  }
}


/**
 * A renderer for `<svg>` data.
 */
export
class SVGRenderer implements IRenderer<Widget> {
  mimetypes = ['image/svg+xml'];

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    w.node.innerHTML = data;
    let svgElement = w.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
    }
    return w;
  }
}


/**
 * A renderer for PDF data.
 */
export
class PDFRenderer implements IRenderer<Widget> {
  mimetypes = ['application/pdf'];

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = 'data:application/pdf;base64,' + data;
    w.node.appendChild(a);
    return w;
  }
}


/**
 * A renderer for LateX data.
 */
export
class LatexRenderer implements IRenderer<Widget> {
  mimetypes = ['text/latex'];

  render(mimetype: string, data: string): Widget {
    return new HTMLWidget(data);
  }
}


/**
 * A renderer for Jupyter Markdown data.
 */
export
class MarkdownRenderer implements IRenderer<Widget> {
  mimetypes = ['text/markdown'];

  render(mimetype: string, text: string): Widget {
    let data = removeMath(text);
    let widget = new HTMLWidget('');
    marked(data['text'], (err, content) => {
      content = replaceMath(content, data['math']);
      let sanitized = defaultSanitizer.sanitize(content);
      widget.html = sanitized;
    });
    return widget;
  }
}
