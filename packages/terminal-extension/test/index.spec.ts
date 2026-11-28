// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import type { Terminal } from '@jupyterlab/services';
import type { IStateDB } from '@jupyterlab/statedb';
import type { ITerminal } from '@jupyterlab/terminal';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import { RunningTerminalSignaler } from '../src';

/**
 * A minimal stand-in for a terminal widget: the title signaler only reads
 * the session name from the terminal content.
 */
class FakeTerminal extends Widget {
  constructor(name: string) {
    super();
    this.session = { name } as unknown as Terminal.ITerminalConnection;
    this.addClass('jp-Terminal');
  }

  readonly session: Terminal.ITerminalConnection;
}

/**
 * A minimal stand-in for the terminal manager: the title signaler only
 * reads the running terminals and their `runningChanged` signal.
 */
class FakeTerminalManager {
  constructor(models: Array<Terminal.IModel> = []) {
    this._models = models;
  }

  get ready(): Promise<void> {
    return Promise.resolve();
  }

  get runningChanged(): ISignal<this, Terminal.IModel[]> {
    return this._runningChanged;
  }

  running(): Terminal.IModel[] {
    return this._models;
  }

  private _models: Terminal.IModel[];
  private _runningChanged = new Signal<this, Terminal.IModel[]>(this);
}

/**
 * An in-memory state database, standing in for the workspace state.
 */
class MemoryStateDB implements IStateDB<Record<string, string>> {
  readonly ready: Promise<void> = Promise.resolve();

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  async fetch(id: string): Promise<Record<string, string> | undefined> {
    return this._data.get(id);
  }

  async list(): Promise<{ ids: string[]; values: Record<string, string>[] }> {
    return {
      ids: Array.from(this._data.keys()),
      values: Array.from(this._data.values())
    };
  }

  async remove(id: string): Promise<void> {
    this._data.delete(id);
  }

  async save(id: string, value: Record<string, string>): Promise<void> {
    this._data.set(id, value);
  }

  async toJSON(): Promise<{ [id: string]: Record<string, string> }> {
    return Object.fromEntries(this._data);
  }

  dispose(): void {
    this._isDisposed = true;
  }

  private _data = new Map<string, Record<string, string>>();
  private _isDisposed = false;
}

describe('terminal-extension/index', () => {
  describe('RunningTerminalSignaler', () => {
    let tracker: WidgetTracker<MainAreaWidget<ITerminal.ITerminal>>;
    let manager: FakeTerminalManager;
    let stateDB: MemoryStateDB;

    beforeEach(() => {
      tracker = new WidgetTracker({ namespace: 'terminal-extension-tests' });
      manager = new FakeTerminalManager([{ name: '1' } as Terminal.IModel]);
      stateDB = new MemoryStateDB();
    });

    afterEach(() => {
      tracker.dispose();
    });

    /**
     * Create a terminal widget backed by a fake terminal session.
     */
    function createWidget(name: string): MainAreaWidget<ITerminal.ITerminal> {
      const content = new FakeTerminal(name);
      const widget = new MainAreaWidget<ITerminal.ITerminal>({
        content: content as unknown as ITerminal.ITerminal
      });
      void tracker.add(widget);
      return widget;
    }

    /**
     * Create a signaler over the shared manager and state database.
     */
    function createSignaler(): RunningTerminalSignaler {
      return new RunningTerminalSignaler(
        manager as unknown as Terminal.IManager,
        tracker,
        stateDB
      );
    }

    it('should report the title set by the user', async () => {
      const signaler = createSignaler();
      createWidget('1');

      signaler.setTitle('1', 'Data processing');

      expect(await signaler.title('1')).toBe('Data processing');
      expect(signaler.label('1')).toBe('Data processing');
    });

    it('should update the tab title of the matching terminal', async () => {
      const signaler = createSignaler();
      const widget = createWidget('1');

      signaler.setTitle('1', 'Data processing');

      expect(await signaler.title('1')).toBe('Data processing');
      expect(widget.title.label).toBe('Data processing');
    });

    it('should reset the title to the default when the label is empty', async () => {
      const signaler = createSignaler();
      const widget = createWidget('1');
      signaler.setTitle('1', 'Data processing');
      expect(await signaler.title('1')).toBe('Data processing');

      signaler.setTitle('1', '');

      expect(await signaler.title('1')).toBe('terminals/1');
      expect(widget.title.label).toBe('terminals/1');
    });

    it('should remember titles of terminals that are not open', async () => {
      const signaler = createSignaler();

      signaler.setTitle('2', 'Background job');

      expect(await signaler.title('2')).toBe('Background job');
      expect(signaler.label('2')).toBe('Background job');
    });

    it('should restore persisted titles in a new signaler', async () => {
      const signaler = createSignaler();
      createWidget('1');
      signaler.setTitle('1', 'Data processing');
      // Titles are saved through a throttler; wait for its window to elapse.
      await new Promise(resolve => setTimeout(resolve, 1200));

      const restored = createSignaler();

      expect(await restored.title('1')).toBe('Data processing');
    });
  });
});
