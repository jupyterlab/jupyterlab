// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Modified from jupyterlab/packages/completer/src/connector.ts

import { DataConnector } from '@jupyterlab/statedb';
import { CompletionHandler } from '@jupyterlab/completer';

/**
 * A multi-connector connector for completion handlers.
 */
export class CompletionConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  /**
   * Create a new connector for completion requests.
   *
   * @param connectors - Connectors to request matches from, ordered by metadata preference (descending).
   */
  constructor(
    connectors: DataConnector<
      CompletionHandler.IReply,
      void,
      CompletionHandler.IRequest
    >[]
  ) {
    super();
    this._connectors = connectors;
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.IReply> {
    return Promise.all(this._connectors.map(con => con.fetch(request))).then(
      replies => {
        const definedReplies = replies.filter(
          (reply): reply is CompletionHandler.IReply => !!reply
        );
        return Private.mergeReplies(definedReplies);
      }
    );
  }

  private _connectors: DataConnector<
    CompletionHandler.IReply,
    void,
    CompletionHandler.IRequest
  >[];
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * Merge results from multiple connectors.
   *
   * @param replies - Array of completion results.
   *
   * @returns IReply with a superset of all matches.
   */
  export function mergeReplies(
    replies: Array<CompletionHandler.IReply>
  ): CompletionHandler.IReply {
    // Filter replies with matches.
    const repliesWithMatches = replies.filter(rep => rep.matches.length > 0);
    // If no replies contain matches, return an empty IReply.
    if (repliesWithMatches.length === 0) {
      return replies[0];
    }
    // If only one reply contains matches, return it.
    if (repliesWithMatches.length === 1) {
      return repliesWithMatches[0];
    }

    // Collect unique matches from all replies.
    let matches: Set<string> = new Set();
    repliesWithMatches.forEach(reply => {
      reply.matches.forEach(match => matches.add(match));
    });

    // Note that the returned metadata field only contains items in the first member of repliesWithMatches.
    return { ...repliesWithMatches[0], matches: [...matches] };
  }
}
