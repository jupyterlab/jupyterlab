/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IDocumentProvider } from './index';

export class ProviderMock implements IDocumentProvider {
  get ready(): Promise<boolean> {
    return Promise.resolve(true);
  }

  destroy(): void {
    /* nop */
  }
}
