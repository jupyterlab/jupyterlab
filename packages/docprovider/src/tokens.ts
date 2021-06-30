import { DocumentChange, YDocument } from '@jupyterlab/shared-models';
import { Token } from '@lumino/coreutils';

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
   * Put the initialized state.
   */
  putInitializedState(): void;

  /**
   * Acquire a lock.
   * Returns a Promise that resolves to the lock number.
   */
  acquireLock(): Promise<number>;

  /**
   * Release a lock.
   *
   * @param lock The lock to release.
   */
  releaseLock(lock: number): void;

  /**
   * This should be called by the docregistry when the file has been renamed to update the websocket connection url
   */
  setPath(newPath: string): void;

  /**
   * Destroy the provider.
   */
  destroy(): void;
}

/**
 * The type for the document provider factory.
 */
export type IDocumentProviderFactory = (
  options: IDocumentProviderFactory.IOptions
) => IDocumentProvider;

/**
 * A namespace for IDocumentProviderFactory statics.
 */
export namespace IDocumentProviderFactory {
  /**
   * The instantiation options for a IDocumentProviderFactory.
   */
  export interface IOptions {
    /**
     * The name (id) of the room
     */
    path: string;
    contentType: string;

    /**
     * The YNotebook.
     */
    ymodel: YDocument<DocumentChange>;
  }
}
