/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISharedDocument } from '@jupyter-notebook/ydoc';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';

/**
 * The default document provider token.
 */
export const IDocumentProviderFactory = new Token<IDocumentProviderFactory>(
  '@jupyterlab/docprovider:IDocumentProviderFactory'
);

/**
 * An interface for a document provider.
 */
export interface IDocumentProvider extends IDisposable {
  /**
   * Returns a Promise that resolves when the document provider is ready.
   */
  readonly ready: Promise<void>;
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
     * The document file path
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
     * The shared model
     */
    model: T;

    /**
     * Whether the document provider should be collaborative.
     */
    collaborative: boolean;
  }
}
