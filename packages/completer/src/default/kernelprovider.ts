// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelMessage } from '@jupyterlab/services';
import { ICompletionContext, ICompletionProvider } from '../tokens';
import { CompletionHandler } from '../handler';
import { JSONObject } from '@lumino/coreutils';

export const KERNEL_PROVIDER_ID = 'CompletionProvider:kernel';
/**
 * A kernel connector for completion handlers.
 */
export class KernelCompleterProvider implements ICompletionProvider {
  /**
   * The kernel completion provider is applicable only if the kernel is available.
   * @param context - additional information about context of completion request
   */
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    const hasKernel = context.session?.kernel;
    if (!hasKernel) {
      return false;
    }
    return true;
  }
  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    const kernel = context.session?.kernel;
    if (!kernel) {
      throw new Error('No kernel for completion request.');
    }

    const contents: KernelMessage.ICompleteRequestMsg['content'] = {
      code: request.text,
      cursor_pos: request.offset
    };

    const msg = await kernel.requestComplete(contents);
    const response = msg.content;

    if (response.status !== 'ok') {
      throw new Error('Completion fetch failed to return successfully.');
    }

    const items = new Array<CompletionHandler.ICompletionItem>();
    const metadata = response.metadata._jupyter_types_experimental as Array<
      JSONObject
    >;
    response.matches.forEach((label, index) => {
      if (metadata[index]) {
        items.push({
          label,
          type: metadata[index].type as string,
          insertText: metadata[index].text as string
        });
      } else {
        items.push({ label });
      }
    });

    return {
      start: response.cursor_start,
      end: response.cursor_end,
      items
    };
  }

  readonly identifier = KERNEL_PROVIDER_ID;
  readonly renderer = null;
}
