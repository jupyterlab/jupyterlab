import { IDocumentProvider } from './index';

/**
 * Fallback document provider
 */
export class ProviderMock implements IDocumentProvider {
  /**
   * Test whether the object has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Returns a Promise that resolves when the document provider is ready.
   */
  get ready(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Dispose of the resources held by the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
  }

  private _isDisposed = false;
}
