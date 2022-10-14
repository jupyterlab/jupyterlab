/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISharedDocument } from '@jupyterlab/shared-models';
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
   * Destroy the provider.
   */
  destroy(): void;
}

/**
 * The type for the document provider factory.
 */
export type IDocumentProviderFactory<
  T extends ISharedDocument = ISharedDocument
> = (options: IDocumentProviderFactory.IOptions<T>) => IDocumentProvider;

/**
 * A namespace for IDocumentProviderFactory statics.
 */
export namespace IDocumentProviderFactory {
  /**
   * The instantiation options for a IDocumentProviderFactory.
   */
  export interface IOptions<T extends ISharedDocument> {
    /**
     * The name (id) of the room
     */
    path: string;

    /**
     * Content type
     */
    contentType: string;

    /**
     * The source format
     */
    format: string;

    /**
     * The document model
     */
    model: T;
  }
}
