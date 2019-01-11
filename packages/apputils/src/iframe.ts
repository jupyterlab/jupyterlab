// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';

/**
 * A phosphor widget which wraps an IFrame.
 */
export class IFrame extends Widget {
  /**
   * Create a new IFrame widget.
   */
  constructor(options: IFrame.IOptions = {}) {
    super({ node: Private.createNode() });
    this.addClass('jp-IFrame');
    this._exceptions = options.exceptions || [];
    this.sandbox = !!options.sandbox;
  }

  /**
   * Whether the iframe is sandboxed.
   */
  get sandbox(): boolean {
    const iframe = this.node.querySelector('iframe')!;
    const attr = iframe.getAttribute('sandbox');
    return attr !== null && attr !== undefined; // An empty string is sandboxed.
  }
  set sandbox(value: boolean) {
    const iframe = this.node.querySelector('iframe')!;
    const old = this.sandbox;
    if (old === value) {
      return;
    }
    if (value) {
      const exceptions = this._exceptions.length
        ? this._exceptions.join(' ')
        : '';
      iframe.setAttribute('sandbox', exceptions);
    } else {
      iframe.removeAttribute('sandbox');
    }
  }

  /**
   * Exceptions to the sandboxing.
   *
   * #### Notes.
   * If sandboxing is off, these are ignored.
   */
  get exceptions(): IFrame.SandboxExceptions[] {
    return this._exceptions.slice();
  }
  set exceptions(values: IFrame.SandboxExceptions[]) {
    this._exceptions = values.slice();
    const iframe = this.node.querySelector('iframe')!;
    if (this.sandbox) {
      const exceptions = this._exceptions.length
        ? this._exceptions.join(' ')
        : '';
      iframe.setAttribute('sandbox', exceptions);
    }
  }

  /**
   * The url of the IFrame.
   */
  get url(): string {
    return this.node.querySelector('iframe')!.getAttribute('src') || '';
  }
  set url(url: string) {
    this.node.querySelector('iframe')!.setAttribute('src', url);
  }

  private _exceptions: IFrame.SandboxExceptions[] = [];
}

/**
 * A namespace for IFrame widget statics.
 */
export namespace IFrame {
  export type SandboxExceptions =
    | 'allow-forms'
    | 'allow-modals'
    | 'allow-orientation-lock'
    | 'allow-pointer-lock'
    | 'allow-popups'
    | 'popups-to-escape-sandbox'
    | 'allow-presentation'
    | 'allow-same-origin'
    | 'allow-scripts'
    | 'allow-storage-access-by-user-activation'
    | 'allow-top-navigation'
    | 'allow-top-navigation-by-user-activation';

  /**
   * Options for creating a new IFrame widget.
   */
  export interface IOptions {
    /**
     * Whether to sandbox the iframe.
     */
    sandbox?: boolean;

    /**
     * Exceptions to the sandbox, if on.
     */
    exceptions?: SandboxExceptions[];
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the main content node of an iframe widget.
   */
  export function createNode(): HTMLElement {
    let node = document.createElement('div');
    let iframe = document.createElement('iframe');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    node.appendChild(iframe);
    return node;
  }
}
