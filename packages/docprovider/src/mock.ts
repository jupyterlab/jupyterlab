import { IDocumentProvider } from './index.js';

export class ProviderMock implements IDocumentProvider {
  destroy(): void {
    /* nop */
  }
  setPath(path: string): void {
    /* nop */
  }
  get renameAck(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
