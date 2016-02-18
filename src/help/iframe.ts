// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Widget
} from 'phosphor-widget';


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
   * Create the main content node of an iframe widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let iframe = document.createElement('iframe');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    node.appendChild(iframe);
    return node;
  }

  /**
   * Create a new iframe widget.
   */
  constructor() {
    super();
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
