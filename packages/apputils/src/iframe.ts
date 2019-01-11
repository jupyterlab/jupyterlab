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
    if (options.sandbox === true) {
      const node = this.node.querySelector('iframe')!;
      const exceptions =
        options.exceptions && options.exceptions.length
          ? options.exceptions.join(' ')
          : '';
      node.setAttribute('sandbox', exceptions);
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
