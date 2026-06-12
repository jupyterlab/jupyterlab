// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '@jupyterlab/services';
import { signalToPromise } from '@jupyterlab/testing';
import { Signal } from '@lumino/signaling';
import type { FileWatcher, IFileWatcherService } from '../src';
import { FileWatchController, FileWatcherService } from '../src';

// ---------------------------------------------------------------------------
// MockWebSocket — replaces the real WebSocket in serverSettings
// ---------------------------------------------------------------------------

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = WebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    // Trigger onopen on the next microtask (mirrors real WebSocket behaviour)
    void Promise.resolve().then(() => this.onopen?.());
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.onclose?.();
  }

  /** Simulate a server → client push message. */
  push(payload: Record<string, string>): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

function makeSettings(): ServerConnection.ISettings {
  return ServerConnection.makeSettings({
    WebSocket: MockWebSocket as unknown as typeof WebSocket
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileWatcherService', () => {
  let service: FileWatcherService;

  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    service?.dispose();
    jest.useRealTimers();
  });

  // ---- construction -------------------------------------------------------

  describe('#constructor()', () => {
    it('should connect to the correct URL', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve(); // flush onopen microtask
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toContain('lab/api/filewatch');
    });

    it('should start with isAvailable=true', () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      expect(service.isAvailable).toBe(true);
    });

    it('should start with isDisposed=false', () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      expect(service.isDisposed).toBe(false);
    });
  });

  // ---- subscribe / unsubscribe --------------------------------------------

  describe('#subscribe()', () => {
    it('should send a subscribe message', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.subscribe('notebooks/analysis.ipynb');
      const parsed = MockWebSocket.instances[0].sentMessages.map(m =>
        JSON.parse(m)
      );
      expect(parsed).toContainEqual({
        msgType: 'subscribe',
        path: 'notebooks/analysis.ipynb'
      });
    });
  });

  describe('#unsubscribe()', () => {
    it('should send an unsubscribe message', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.subscribe('test.ipynb');
      service.unsubscribe('test.ipynb');
      const parsed = MockWebSocket.instances[0].sentMessages.map(m =>
        JSON.parse(m)
      );
      expect(parsed).toContainEqual({
        msgType: 'unsubscribe',
        path: 'test.ipynb'
      });
    });
  });

  // ---- incoming messages --------------------------------------------------

  describe('#fileChanged signal', () => {
    it('should emit on a changed message', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.subscribe('notebook.ipynb');

      const promise = signalToPromise(service.fileChanged);
      MockWebSocket.instances[0].push({
        msgType: 'changed',
        path: 'notebook.ipynb',
        eventType: 'modified'
      });

      const [, args] = await promise;
      expect(args.path).toBe('notebook.ipynb');
      expect(args.eventType).toBe('modified');
    });

    it('should emit with eventType=deleted for deleted files', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.subscribe('gone.txt');

      const promise = signalToPromise(service.fileChanged);
      MockWebSocket.instances[0].push({
        msgType: 'changed',
        path: 'gone.txt',
        eventType: 'deleted'
      });

      const [, args] = await promise;
      expect(args.eventType).toBe('deleted');
    });
  });

  // ---- unavailable --------------------------------------------------------

  describe('unavailable message', () => {
    it('should set isAvailable=false', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      MockWebSocket.instances[0].push({
        msgType: 'unavailable',
        reason: 'watchdog is not installed'
      });
      expect(service.isAvailable).toBe(false);
    });

    it('should not reconnect after unavailable', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      MockWebSocket.instances[0].push({
        msgType: 'unavailable',
        reason: 'watchdog is not installed'
      });
      // Simulate socket close after unavailable
      MockWebSocket.instances[0].close();
      jest.advanceTimersByTime(60_000);
      // No new WebSocket should have been created
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  // ---- reconnect ----------------------------------------------------------

  describe('reconnection', () => {
    it('should reconnect after socket closes', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();

      MockWebSocket.instances[0].close(); // triggers scheduleReconnect
      jest.advanceTimersByTime(1100); // past 1 s initial delay
      await Promise.resolve(); // flush onopen

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it('should replay subscriptions on reconnect', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.subscribe('a.ipynb');
      service.subscribe('b.ipynb');

      MockWebSocket.instances[0].close();
      jest.advanceTimersByTime(1100);
      await Promise.resolve();

      const ws2 = MockWebSocket.instances[1];
      const msgs = ws2.sentMessages.map(
        m => JSON.parse(m) as Record<string, string>
      );
      const subscribed = msgs
        .filter(m => m['msgType'] === 'subscribe')
        .map(m => m['path']);
      expect(subscribed).toContain('a.ipynb');
      expect(subscribed).toContain('b.ipynb');
    });

    it('should reset back-off after a successful reconnect', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();

      // First close → reconnect after 1 s (initial delay)
      MockWebSocket.instances[0].close();
      jest.advanceTimersByTime(1001);
      await Promise.resolve(); // flush onopen → resets delay
      expect(MockWebSocket.instances).toHaveLength(2);

      // Second close → since delay was reset on onopen, reconnect again at 1 s
      MockWebSocket.instances[1].close();
      jest.advanceTimersByTime(999);
      expect(MockWebSocket.instances).toHaveLength(2); // not yet

      jest.advanceTimersByTime(2);
      await Promise.resolve();
      expect(MockWebSocket.instances).toHaveLength(3);
    });
  });

  // ---- dispose ------------------------------------------------------------

  describe('#dispose()', () => {
    it('should set isDisposed=true', () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      service.dispose();
      expect(service.isDisposed).toBe(true);
    });

    it('should not reconnect after dispose', async () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      await Promise.resolve();
      service.dispose();
      jest.advanceTimersByTime(60_000);
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('should be idempotent', () => {
      service = new FileWatcherService({ serverSettings: makeSettings() });
      expect(() => {
        service.dispose();
        service.dispose();
      }).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// FileWatchController tests
// ---------------------------------------------------------------------------

/** Minimal service double that lets us drive fileChanged from tests. */
class FakeService implements IFileWatcherService {
  readonly fileChanged = new Signal<this, FileWatcher.IChangedArgs>(this);
  readonly isAvailable = true;
  isDisposed = false;
  subscribed: string[] = [];
  unsubscribed: string[] = [];

  subscribe(path: string): void {
    this.subscribed.push(path);
  }
  unsubscribe(path: string): void {
    this.unsubscribed.push(path);
  }
  dispose(): void {
    this.isDisposed = true;
    Signal.clearData(this);
  }
  /** Helper to push a change event to the controller. */
  emit(args: FileWatcher.IChangedArgs): void {
    this.fileChanged.emit(args);
  }
}

/** Minimal DocumentRegistry.Context double exposing only what the controller uses. */
class FakeContext {
  readonly disposed = new Signal<this, void>(this);
  readonly saveState = new Signal<this, string>(this);
  readonly pathChanged = new Signal<this, string>(this);
  model = { dirty: false };
  save = jest.fn(() => Promise.resolve());
  revert = jest.fn(() => Promise.resolve());

  constructor(public path: string) {}

  dispose(): void {
    this.disposed.emit();
  }
  /** Simulate a rename — updates the path and emits pathChanged. */
  rename(newPath: string): void {
    this.path = newPath;
    this.pathChanged.emit(newPath);
  }
  /** Trigger a saveState transition (only 'completed' matters to the controller). */
  emitSaveState(state: string): void {
    this.saveState.emit(state);
  }
}

function makeController(opts: {
  service: FakeService;
  watchEnabled?: boolean;
  autoReload?: boolean;
}): {
  controller: FileWatchController;
  notifyDeleted: jest.Mock;
  notifyChanged: jest.Mock;
} {
  const notifyDeleted = jest.fn();
  const notifyChanged = jest.fn();
  const controller = new FileWatchController({
    service: opts.service,
    getSettings: () => ({
      watchEnabled: opts.watchEnabled ?? true,
      autoReload: opts.autoReload ?? true
    }),
    notifyDeleted,
    notifyChanged
  });
  return { controller, notifyDeleted, notifyChanged };
}

describe('FileWatchController', () => {
  let service: FakeService;

  beforeEach(() => {
    service = new FakeService();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---- track() ------------------------------------------------------------

  describe('#track()', () => {
    it('should subscribe the path on the service', () => {
      const { controller } = makeController({ service });
      controller.track(new FakeContext('a.txt') as any);
      expect(service.subscribed).toEqual(['a.txt']);
    });

    it('should be a no-op if the same context is tracked twice', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      controller.track(ctx as any);
      expect(service.subscribed).toEqual(['a.txt']);
    });

    it('should unsubscribe when the only context for a path is disposed', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      ctx.dispose();
      expect(service.unsubscribed).toEqual(['a.txt']);
    });

    it('should keep the subscription when a second context for the same path is open', () => {
      const { controller } = makeController({ service });
      const ctx1 = new FakeContext('a.txt');
      const ctx2 = new FakeContext('a.txt');
      controller.track(ctx1 as any);
      controller.track(ctx2 as any);
      ctx1.dispose();
      expect(service.unsubscribed).toEqual([]);
      ctx2.dispose();
      expect(service.unsubscribed).toEqual(['a.txt']);
    });
  });

  // ---- clean files -------------------------------------------------------

  describe('clean file reaction', () => {
    it('should silently revert when autoReload=true', () => {
      const { controller } = makeController({ service, autoReload: true });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
      expect(ctx.save).not.toHaveBeenCalled();
    });

    it('should notify with a reload callback when autoReload=false', () => {
      const { controller, notifyChanged } = makeController({
        service,
        autoReload: false
      });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(notifyChanged).toHaveBeenCalledTimes(1);
      expect(notifyChanged).toHaveBeenCalledWith('a.txt', expect.any(Function));
      expect(ctx.revert).not.toHaveBeenCalled();

      // The reload callback should call context.revert().
      const reloadCb = notifyChanged.mock.calls[0][1];
      reloadCb();
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });
  });

  // ---- dirty files -------------------------------------------------------

  describe('dirty file reaction', () => {
    it('should call context.save() to trigger the conflict modal', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      ctx.model.dirty = true;
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.revert).not.toHaveBeenCalled();
    });

    it('should swallow rejected save() (user cancelled / modal already open)', async () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      ctx.model.dirty = true;
      ctx.save.mockRejectedValueOnce(new Error('ModalCancelError'));
      controller.track(ctx as any);
      expect(() =>
        service.emit({ path: 'a.txt', eventType: 'modified' })
      ).not.toThrow();
      // Wait for the .catch() to run.
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  // ---- rename ------------------------------------------------------------

  describe('rename reaction', () => {
    it('should unsubscribe the old path and subscribe the new one', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('untitled.txt');
      controller.track(ctx as any);
      expect(service.subscribed).toEqual(['untitled.txt']);

      ctx.rename('notes.txt');
      expect(service.unsubscribed).toEqual(['untitled.txt']);
      expect(service.subscribed).toEqual(['untitled.txt', 'notes.txt']);
    });

    it('should react to external changes at the new path after rename', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('untitled.txt');
      controller.track(ctx as any);
      ctx.rename('notes.txt');

      // An event at the OLD path must NOT trigger anything.
      service.emit({ path: 'untitled.txt', eventType: 'modified' });
      expect(ctx.revert).not.toHaveBeenCalled();

      // An event at the NEW path must trigger the revert.
      service.emit({ path: 'notes.txt', eventType: 'modified' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op when rename emits the same path', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      ctx.rename('a.txt');
      expect(service.unsubscribed).toEqual([]);
      expect(service.subscribed).toEqual(['a.txt']);
    });
  });

  // ---- moved -------------------------------------------------------------

  describe('moved reaction', () => {
    it('should treat a clean moved file the same as modified (revert when autoReload=true)', () => {
      const { controller } = makeController({ service, autoReload: true });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'moved' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });

    it('should treat a dirty moved file the same as modified (trigger save)', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      ctx.model.dirty = true;
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'moved' });
      expect(ctx.save).toHaveBeenCalledTimes(1);
    });
  });

  // ---- deleted -----------------------------------------------------------

  describe('deleted reaction', () => {
    it('should call notifyDeleted and not touch save/revert', () => {
      const { controller, notifyDeleted } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'deleted' });
      expect(notifyDeleted).toHaveBeenCalledWith('a.txt');
      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.revert).not.toHaveBeenCalled();
    });
  });

  // ---- settings ----------------------------------------------------------

  describe('settings', () => {
    it('should ignore events when watchEnabled=false', () => {
      const { controller, notifyDeleted } = makeController({
        service,
        watchEnabled: false
      });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      service.emit({ path: 'a.txt', eventType: 'modified' });
      service.emit({ path: 'a.txt', eventType: 'deleted' });
      expect(ctx.revert).not.toHaveBeenCalled();
      expect(notifyDeleted).not.toHaveBeenCalled();
    });

    it('should re-read settings on every event (dynamic toggle)', () => {
      let watchEnabled = false;
      const ctx = new FakeContext('a.txt');
      const controller = new FileWatchController({
        service,
        getSettings: () => ({ watchEnabled, autoReload: true }),
        notifyDeleted: jest.fn(),
        notifyChanged: jest.fn()
      });
      controller.track(ctx as any);

      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).not.toHaveBeenCalled();

      watchEnabled = true;
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });
  });

  // ---- echo suppression --------------------------------------------------

  describe('echo suppression', () => {
    it('should suppress events that arrive within the window after a completed save', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);

      // Simulate Ctrl+S → context emits saveState 'completed'.
      ctx.emitSaveState('completed');

      // The watchdog echo that follows must be suppressed.
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).not.toHaveBeenCalled();
    });

    it('should release suppression after the window elapses', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);

      ctx.emitSaveState('completed');
      jest.advanceTimersByTime(FileWatchController.SUPPRESS_WINDOW_MS + 50);
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });

    it('should NOT suppress when saveState is not "completed"', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);

      ctx.emitSaveState('started');
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).toHaveBeenCalledTimes(1);
    });

    it('should collapse a multi-event burst on a dirty file into one modal', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      ctx.model.dirty = true;
      controller.track(ctx as any);

      service.emit({ path: 'a.txt', eventType: 'modified' });
      service.emit({ path: 'a.txt', eventType: 'modified' });
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.save).toHaveBeenCalledTimes(1);
    });
  });

  // ---- dispose -----------------------------------------------------------

  describe('#dispose()', () => {
    it('should be idempotent', () => {
      const { controller } = makeController({ service });
      expect(() => {
        controller.dispose();
        controller.dispose();
      }).not.toThrow();
      expect(controller.isDisposed).toBe(true);
    });

    it('should unsubscribe all tracked paths', () => {
      const { controller } = makeController({ service });
      controller.track(new FakeContext('a.txt') as any);
      controller.track(new FakeContext('b.txt') as any);
      controller.dispose();
      expect(service.unsubscribed).toEqual(['a.txt', 'b.txt']);
    });

    it('should stop reacting to file change events', () => {
      const { controller } = makeController({ service });
      const ctx = new FakeContext('a.txt');
      controller.track(ctx as any);
      controller.dispose();
      service.emit({ path: 'a.txt', eventType: 'modified' });
      expect(ctx.revert).not.toHaveBeenCalled();
    });
  });
});
