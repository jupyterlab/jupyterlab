import { Token } from '@lumino/coreutils';

import { DocumentChange, YDocument} from '@jupyterlab/shared-models';

/**
 * The default document provider token.
 */
export const IProviderFactory = new Token<IProviderFactory>(
  '@jupyterlab/docprovider:IProviderFactory'
);

/**
 * An interface for a document provider.
 */
export interface IProvider {
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

export type IProviderFactory = (
  options: IProviderFactory.IOptions
) => IProvider;

export namespace IProviderFactory {
  export interface IOptions {
    /**
     * The server URL.
     */
    url: string;

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
