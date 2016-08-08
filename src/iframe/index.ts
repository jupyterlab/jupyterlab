// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * The class name added to an IFrame widget.
 */
const IFRAME_CLASS = 'jp-IFrame';


/**
 * A phosphor widget which wraps an IFrame.
 */
export
class IFrame extends Widget {
  /**
   * Create a new iframe widget.
   */
  constructor() {
    super({ node: Private.createNode() });
    this.addClass(IFRAME_CLASS);
  }

  /**
   * Load a URL into the iframe.
   *
   * @param url - The URL to load into the iframe widget.
   */
  loadURL(url: string): void {
    this.node.querySelector('iframe').setAttribute('src', url);
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the main content node of an iframe widget.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    let iframe = document.createElement('iframe');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    node.appendChild(iframe);
    return node;
  }
}
