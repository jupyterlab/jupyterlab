// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DataConnector } from '@jupyterlab/statedb';
import { ContextConnector } from './contextconnector';
import { CompletionHandler } from '../handler';
import { KernelConnector } from './kernelconnector';

/**
 * A context+kernel connector for completion handlers.
 */
export class CompletionConnector extends DataConnector<
  CompletionHandler.ICompletionItemsReply,
  void,
  CompletionHandler.IRequest
> {
  /**
   * Create a new connector for completion requests.
   *
   * @param options - The instantiation options for the connector.
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
  ): Promise<CompletionHandler.ICompletionItemsReply> {  
    return Promise.all([
      this._kernel.fetch(request),
      this._context.fetch(request)
    ]).then(([kernel, context]) => Private.mergeReplies(kernel, context));
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
   *
   * @param kernel - The kernel reply being merged.
   *
   * @param context - The context reply being merged.
   *
   * @returns A reply with a superset of kernel and context items.
   *
   * #### Notes
   * The kernel and context matches are merged with a preference for kernel
   * results. Both lists are known to contain unique, non-repeating items;
   * so this function returns a non-repeating superset by filtering out
   * duplicates from the context list that appear in the kernel list.
   */
  export function mergeReplies(
    kernel: CompletionHandler.ICompletionItemsReply,
    context: CompletionHandler.ICompletionItemsReply
  ): CompletionHandler.ICompletionItemsReply {
    if (kernel.items.length === 0) {
      return context;
    } else if (context.items.length === 0) {
      return kernel;
    }

    const kernelLabels = new Set(kernel.items.map(item => item.label)) 
    const items = [...kernel.items]
    context.items.forEach(item => {
      if(!kernelLabels.has(item.label)){
        items.push(item)
      }
    })
    return { ...kernel, items };
  }
}
