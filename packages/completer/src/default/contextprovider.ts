// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CompletionHandler } from '../handler';
import { ICompletionContext, ICompletionProvider } from '../tokens';

export const CONTEXT_PROVIDER_ID = 'CompletionProvider:context';
/**
 * A context connector for completion handlers.
 */
export class ContextCompleterProvider implements ICompletionProvider {
  readonly identifier = CONTEXT_PROVIDER_ID;

  readonly rank: number = 500;

  readonly renderer = null;

  /**
   * The context completion provider is applicable on all cases.
   * @param context - additional information about context of completion request
   */
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return true;
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    const editor = context.editor;
    if (!editor) {
      return Promise.reject('No editor');
    }
    return new Promise<CompletionHandler.ICompletionItemsReply>(resolve => {
      resolve(Private.contextHint(editor!));
    });
  }
}

/**
 * A namespace for Private functionality.
 */
namespace Private {
  /**
   * Get a list of completion hints from a tokenization
   * of the editor.
   */
  export function contextHint(
    editor: CodeEditor.IEditor
  ): CompletionHandler.ICompletionItemsReply {
    // Find the token at the cursor
    const token = editor.getTokenAtCursor();

    // Get the list of matching tokens.
    const tokenList = getCompletionTokens(token, editor);

    // Only choose the ones that have a non-empty type
    // field, which are likely to be of interest.
    const completionList = tokenList.filter(t => t.type).map(t => t.value);
    // Remove duplicate completions from the list
    const matches = new Set<string>(completionList);
    const items = new Array<CompletionHandler.ICompletionItem>();
    matches.forEach(label => items.push({ label }));

    return {
      start: token.offset,
      end: token.offset + token.value.length,
      items
    };
  }

  /**
   * Get a list of tokens that match the completion request,
   * but are not identical to the completion request.
   */
  function getCompletionTokens(
    token: CodeEditor.IToken,
    editor: CodeEditor.IEditor
  ): CodeEditor.IToken[] {
    const candidates = editor.getTokens();
    // Only get the tokens that have a common start, but
    // are not identical.
    return candidates.filter(
      t => t.value.indexOf(token.value) === 0 && t.value !== token.value
    );
  }
}
