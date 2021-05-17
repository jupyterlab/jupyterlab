import { Token } from '@lumino/coreutils';

import { DocumentChange, YDocument } from '@jupyterlab/shared-models';

/**
 * The default document provider token.
 */
export const IDocumentProviderFactory = new Token<IDocumentProviderFactory>(
  '@jupyterlab/docprovider:IDocumentProviderFactory'
);

/**
 * An interface for a document provider.
 */
export interface IDocumentProvider {
  /**
   * Resolves to true if the initial content has been initialized on the server. false otherwise.
   */
  requestInitialContent(): Promise<boolean>;

  /**
   * TODO
   */
  putInitializedState(): void;

  /**
   * TODO
   */
  acquireLock(): Promise<number>;

  /**
   * TODO
   * @param lock TODO
   */
  releaseLock(lock: number): void;

  /**
   * TODO
   */
  destroy(): void;
}

export type IDocumentProviderFactory = (
  options: IDocumentProviderFactory.IOptions
) => IDocumentProvider;

export namespace IDocumentProviderFactory {
  export interface IOptions {
    /**
     * The name of the room
     */
    guid: string;

    /**
     * The YNotebook.
     */
    ymodel: YDocument<DocumentChange>;
  }
}
