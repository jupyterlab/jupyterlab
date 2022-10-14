/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IDocumentProvider } from './index';

export class ProviderMock implements IDocumentProvider {
  destroy(): void {
    /* nop */
  }
}
