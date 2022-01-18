// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Token } from '@lumino/coreutils';
import { CompletionHandler } from './handler';
import { Session } from '@jupyterlab/services';
import { Completer } from './widget';


export interface ICompletionProvider {
  /**
   * Unique identifier of the provider
   */
  identifier: string;

  connectorFactory: (options: {
    session: Session.ISessionConnection | null;
    editor: CodeEditor.IEditor | null;
  }) => CompletionHandler.ICompletionItemsConnector;

  renderer: Completer.IRenderer | null | undefined;
}

export const ICompletionProviderManager = new Token<ICompletionProviderManager>(
  '@jupyterlab/completer:ICompletionProviderManager'
);

export interface ICompletionProviderManager {
  registerProvider(provider: ICompletionProvider): void;
}

export namespace ICompletionProviderManager {
  export interface IRegisteredService {
    provider: ICompletionProvider;
  }
}

export interface IConnectorProxy {
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<Array<{ [id: string]: CompletionHandler.ICompletionItemsReply }>>;
}
