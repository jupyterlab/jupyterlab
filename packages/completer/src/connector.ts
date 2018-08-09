// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DataConnector } from '@jupyterlab/coreutils';

import { KernelConnector } from './kernelconnector';

import { ContextConnector } from './contextconnector';

import { CompletionHandler } from './handler';

/**
 * A context+kernel connector for completion handlers.
 */
export class CompletionConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  /**
   * Create a new connector for completion requests.
   *
   * @param options - The instatiation options for the connector.
   */
  constructor(options: CompletionConnector.IOptions) {
    super();
    this._kernel = new KernelConnector(options);
    this._context = new ContextConnector(options);
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.IReply> {
    return Promise.all([
      this._kernel.fetch(request),
      this._context.fetch(request)
    ]).then(([kernelReply, contextReply]) => {
      return Private.mergeReplies(kernelReply, contextReply);
    });
  }

  private _kernel: KernelConnector;
  private _context: ContextConnector;
}

/**
 * A namespace for completion connector statics.
 */
export namespace CompletionConnector {
  /**
   * The instantiation options for cell completion handlers.
   */
  export type IOptions = KernelConnector.IOptions & ContextConnector.IOptions;
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * Merge results from kernel and context completions.
   */
  export function mergeReplies(
    kernel: CompletionHandler.IReply,
    context: CompletionHandler.IReply
  ): CompletionHandler.IReply {
    // If one is empty, return the other.
    if (kernel.matches.length === 0) {
      return context;
    } else if (context.matches.length === 0) {
      return kernel;
    }

    // They both have matches, so merge them, with a preference for the
    // kernel result.
    let matches = kernel.matches.slice();
    context.matches.forEach(match => {
      if (matches.indexOf(match) === -1) {
        matches.push(match);
      }
    });
    return { ...kernel, matches };
  }
}
