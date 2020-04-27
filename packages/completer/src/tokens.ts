// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IDataConnector } from '@jupyterlab/statedb';

import { Token } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { CompletionHandler } from './handler';

/* tslint:disable */
/**
 * The completion manager token.
 */
export const ICompletionManager = new Token<ICompletionManager>(
  '@jupyterlab/completer:ICompletionManager'
);
/* tslint:enable */

/**
 * A manager to register completers with parent widgets.
 */
export interface ICompletionManager {
  /**
   * Register a completable object with the completion manager.
   *
   * @returns A completable object whose attributes can be updated as necessary.
   */
  register(
    completable: ICompletionManager.ICompletable
  ): ICompletionManager.ICompletableAttributes;
}

/**
 * A namespace for `ICompletionManager` interface specifications.
 */
export namespace ICompletionManager {
  /**
   * The attributes of a completable object that can change and sync at runtime.
   */
  export interface ICompletableAttributes {
    /**
     * The host editor for the completer.
     */
    editor: CodeEditor.IEditor | null;

    /**
     * The data connector used to populate the completer.
     * Use the connector with ICompletionItemsReply for enhanced completions.
     */
    connector:
      | IDataConnector<
          CompletionHandler.IReply,
          void,
          CompletionHandler.IRequest
        >
      | CompletionHandler.ICompletionItemsConnector;
  }

  /**
   * An interface for completer-compatible objects.
   */
  export interface ICompletable extends ICompletableAttributes {
    /**
     * The parent of the completer; the completer resources dispose with parent.
     */
    readonly parent: Widget;
  }
}
