// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Widget
} from 'phosphor-widget';

import './iframe.css';


const IFRAME_CLASS = 'jp-IFrame'

const FRAME_CLASS = 'jp-IFrame-iframe';


export
class IFrame extends Widget {
  /**
   * Create the main content node of an iframe widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let iframe = document.createElement('iframe');
    iframe.className = FRAME_CLASS;
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
