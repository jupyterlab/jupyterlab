// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRenderer
} from '../rendermime';

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
  sanitize
} from 'sanitizer';

import {
  typeset, removeMath, replaceMath
} from './latex';


/**
 * A widget for displaying HTML and rendering math.
 */
export
class HTMLWidget extends Widget {
  constructor(html: string) {
    super();
    try {
      var range = document.createRange();
      this.node.appendChild(range.createContextualFragment(html));
    } catch (error) {
      console.warn('Environment does not support Range ' +
                   'createContextualFragment, falling back on innerHTML');
      this.node.innerHTML = html;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   *
   * ####Notes
   * If the node is visible, it is typeset.
   */
  onAfterAttach(msg: Message) {
    typeset(this.node);
  }
}

/**
 * A widget for displaying text and rendering math.
 */
export
class LatexWidget extends Widget {
  constructor(text: string) {
    super();
    this.node.innerHTML = text;
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   *
   * ####Notes
   * If the node is visible, it is typeset.
   */
  onAfterAttach(msg: Message) {
    typeset(this.node);
  }
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
    a.textContent = "View PDF";
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
    return new LatexWidget(data);
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
    let html = marked(data['text']);
    let sanitized = sanitize(replaceMath(html, data['math']));
    return new HTMLWidget(sanitized);
  }
}
