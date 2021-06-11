// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Modified from jupyterlab/packages/completer/src/connector.ts

import { DataConnector } from '@jupyterlab/statedb';
import {
  CompletionHandler,
  ContextConnector,
  KernelConnector
} from '@jupyterlab/completer';

import { CustomConnector } from './customconnector';

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
    this._custom = new CustomConnector(options);
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
      this._context.fetch(request),
      this._custom.fetch(request)
    ]).then(([kernel, context, custom]) =>
      Private.mergeReplies(kernel, context, custom)
    );
  }

  private _kernel: KernelConnector;
  private _context: ContextConnector;
  private _custom: CustomConnector;
}

/**
 * A namespace for completion connector statics.
 */
export namespace CompletionConnector {
  /**
   * The instantiation options for cell completion handlers.
   */
  export type IOptions = KernelConnector.IOptions &
    ContextConnector.IOptions &
    CustomConnector.IOptions;
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * Merge results from kernel and context completions.
   *
   * @param kernel - The kernel reply being merged.
   *
   * @param context - The context reply being merged.
   *
   * @param custom - The custom reply being merged.
   *
   * @returns A reply with a superset of kernel and context matches.
   *
   * #### Notes
   * The kernel and context matches are merged with a preference for kernel
   * results. Both lists are known to contain unique, non-repeating items;
   * so this function returns a non-repeating superset by filtering out
   * duplicates from the context list that appear in the kernel list.
   */
  export function mergeReplies(
    kernel: CompletionHandler.IReply,
    context: CompletionHandler.IReply,
    custom: CompletionHandler.IReply
  ): CompletionHandler.IReply {
    // If two are empty, return the third.
    if (kernel.matches.length === 0 && context.matches.length === 0) {
      return custom;
    } else if (kernel.matches.length === 0) {
      return context;
    } else if (context.matches.length === 0) {
      return kernel;
    }

    // Populate the result with a copy of the kernel matches.
    const matches = kernel.matches.slice();

    // Cache all the kernel matches in a memo.
    const memo = matches.reduce((acc, val) => {
      acc[val] = null;
      return acc;
    }, {} as { [key: string]: string | null });

    // Add each context match that is not in the memo to the result.
    context.matches.forEach(match => {
      if (!(match in memo)) {
        matches.push(match);
      }
    });

    // Add each custom match that is not in the memo to the result.
    custom.matches.forEach(match => {
      if (!(match in memo)) {
        matches.push(match);
      }
    });
    return { ...kernel, matches };
  }
}
