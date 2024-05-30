// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

/**
 * A Lumino widget which wraps an IFrame.
 */
export class IFrame extends Widget {
  /**
   * Create a new IFrame widget.
   */
  constructor(options: IFrame.IOptions = {}) {
    super({ node: Private.createNode() });
    this.addClass('jp-IFrame');
    this.sandbox = options.sandbox || [];
    this.referrerPolicy = options.referrerPolicy || 'no-referrer';
    this.loading = options.loading || 'eager';
  }
  /**
   * Referrer policy for the iframe.
   *
   * #### Notes
   * By default, `no-referrer` is chosen.
   *
   * For more information, see
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/referrerPolicy
   */
  get referrerPolicy(): IFrame.ReferrerPolicy {
    return this._referrerPolicy;
  }
  set referrerPolicy(value: IFrame.ReferrerPolicy) {
    if (this._referrerPolicy === value) {
      return;
    }
    this._referrerPolicy = value;
    const iframe = this.node.querySelector('iframe')!;
    iframe.setAttribute('referrerpolicy', value);
  }

  /**
   * Loading for the iFrame
   *
   * ### Notes
   * By default, 'eager' loading is chosen
   *
   * For more information, see
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/loading
   */
  get loading(): IFrame.Loading {
    return this._loading;
  }
  set loading(value: IFrame.Loading) {
    if (this._loading === value) {
      return;
    }
    this._loading = value;
    const iframe = this.node.querySelector('iframe')!;
    iframe.setAttribute('loading', value);
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
  private _referrerPolicy: IFrame.ReferrerPolicy;
  private _loading: IFrame.Loading;
}

/**
 * A namespace for IFrame widget statics.
 */
export namespace IFrame {
  /**
   * Referrer policy for the iframe.
   *
   * User documentation for the policies can be found here:
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/referrerPolicy
   */
  export type ReferrerPolicy =
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

  /**
   * Exceptions to the iframe sandboxing policies.
   * These are specified here:
   * https://www.w3.org/TR/2011/WD-html5-20110525/the-iframe-element.html#attr-iframe-sandbox
   *
   * More user-friendly documentation can be found here:
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox
   */
  export type SandboxExceptions =
    | 'allow-downloads'
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
   * The loading attribute for the iframe.
   * It can be either 'eager' or 'lazy'.
   */
  export type Loading = 'eager' | 'lazy';

  /**
   * Options for creating a new IFrame widget.
   */
  export interface IOptions {
    /**
     * Exceptions for the iframe sandbox.
     */
    sandbox?: SandboxExceptions[];

    /**
     * Referrer policy for the iframe.
     */
    referrerPolicy?: ReferrerPolicy;

    /**
     * The loading attribute for the iframe.
     */
    loading?: Loading;
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
    const node = document.createElement('div');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', '');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    node.appendChild(iframe);
    return node;
  }
}
