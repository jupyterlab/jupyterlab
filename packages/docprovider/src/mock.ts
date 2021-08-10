import { IDocumentProvider } from './index';

export class ProviderMock implements IDocumentProvider {
  requestInitialContent(): Promise<boolean> {
    return Promise.resolve(false);
  }
  putInitializedState(): void {
    /* nop */
  }
  acquireLock(): Promise<number> {
    return Promise.resolve(0);
  }
  releaseLock(lock: number): void {
    /* nop */
  }
  destroy(): void {
    /* nop */
  }
  setPath(path: string): void {
    /* nop */
  }
}
