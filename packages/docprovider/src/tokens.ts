/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IDisposable } from '@lumino/disposable';

/**
 * An interface for a document provider.
 */
export interface IDocumentProvider extends IDisposable {
  /**
   * Returns a Promise that resolves when the document provider is ready.
   */
  readonly ready: Promise<void>;
}
