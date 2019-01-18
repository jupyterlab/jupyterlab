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
    this.sandbox = options.sandbox || [];
  }

  /**
   * Exceptions to the sandboxing.
   *
   * #### Notes
   * By default, all sandboxing security policies are enabled.
   * This setting allows the user to selectively disable these
   * policies. This should be done with care, as it can
   * introduce security risks, and possibly allow malicious
   * sites to execute code in a JupyterLab session.
   *
   * For more information, see
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
   */
  get sandbox(): IFrame.SandboxExceptions[] {
    return this._sandbox.slice();
  }
  set sandbox(values: IFrame.SandboxExceptions[]) {
    this._sandbox = values.slice();
    const iframe = this.node.querySelector('iframe')!;
    const exceptions = values.length ? values.join(' ') : '';
    iframe.setAttribute('sandbox', exceptions);
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

  private _sandbox: IFrame.SandboxExceptions[] = [];
}

/**
 * A namespace for IFrame widget statics.
 */
export namespace IFrame {
  /**
   * Exceptions to the iframe sandboxing policies.
   * These are specified here:
   * https://www.w3schools.com/tags/att_iframe_sandbox.asp
   */
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
     * Exceptions for the iframe sandbox.
     */
    sandbox?: SandboxExceptions[];
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
    iframe.setAttribute('sandbox', '');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    node.appendChild(iframe);
    return node;
  }
}
