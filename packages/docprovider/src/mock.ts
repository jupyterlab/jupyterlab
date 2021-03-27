import { IProvider } from './index';

export class ProviderMock implements IProvider {
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
}
