// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRenderer
} from '../rendermime';

import * as Convert
  from 'ansi-to-html';

import {
  Widget
} from 'phosphor-widget';

import {
  Message
} from 'phosphor-messaging';

import {
  typeset
} from './latex';


/**
 * A widget for displaying HTML and rendering math.
 */
export
class HTMLWidget extends Widget {
  constructor(html: string) {
    super();
    this.node.innerHTML = html;
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
    this.node.textContent = text;
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
 * A renderer for raw `textContent` data.
 */
export
class TextRenderer implements IRenderer<Widget> {
  mimetypes = ['text/plain'];
  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    w.node.textContent = data;
    return w;
  }
}


/**
 * A renderer for Jupyter console text data.
 */
export
class ConsoleTextRenderer implements IRenderer<Widget> {
  mimetypes = ['application/vnd.jupyter.console-text'];

  constructor() {
    this._converter = new Convert({
      escapeXML: true,
      newline: true
    });
  }

  render(mimetype: string, data: string): Widget {
    let w = new Widget();
    w.node.innerHTML = this._converter.toHtml(data);
    return w;
  }

  private _converter: Convert = null;
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
      throw new Error("SVGRender: Error: Failed to create <svg> element");
    }
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
