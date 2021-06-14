// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Modified from jupyterlab/packages/completer/src/contextconnector.ts

import { CodeEditor } from '@jupyterlab/codeeditor';
import { DataConnector } from '@jupyterlab/statedb';
import { CompletionHandler } from '@jupyterlab/completer';

/**
 * A custom connector for completion handlers.
 */
export class CustomConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  /**
   * Create a new custom connector for completion requests.
   *
   * @param options - The instatiation options for the custom connector.
   */
  constructor(options: CustomConnector.IOptions) {
    super();
    this._editor = options.editor;
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.IReply> {
    if (!this._editor) {
      return Promise.reject('No editor');
    }
    return new Promise<CompletionHandler.IReply>(resolve => {
      resolve(Private.contextHint(this._editor!));
    });
  }

  private _editor: CodeEditor.IEditor | null;
}

/**
 * A namespace for custom connector statics.
 */
export namespace CustomConnector {
  /**
   * The instantiation options for cell completion handlers.
   */
  export interface IOptions {
    /**
     * The session used by the custom connector.
     */
    editor: CodeEditor.IEditor | null;
  }
}

/**
 * A namespace for Private functionality.
 */
namespace Private {
  /**
   * Get a list of mocked completion hints.
   */
  export function contextHint(
    editor: CodeEditor.IEditor
  ): CompletionHandler.IReply {
    // Find the token at the cursor
    const cursor = editor.getCursorPosition();
    const token = editor.getTokenForPosition(cursor);

    // Get the list of matching tokens.
    const tokenList = [
      { value: token.value + 'Magic', offset: token.offset, type: 'magic' },
      { value: token.value + 'Science', offset: token.offset, type: 'science' },
      { value: token.value + 'Neither', offset: token.offset }
    ];

    // Only choose the ones that have a non-empty type field, which are likely to be of interest.
    const completionList = tokenList.filter(t => t.type).map(t => t.value);
    // Remove duplicate completsions from the list
    const matches = Array.from(new Set<string>(completionList));

    return {
      start: token.offset,
      end: token.offset + token.value.length,
      matches,
      metadata: {}
    };
  }
}
