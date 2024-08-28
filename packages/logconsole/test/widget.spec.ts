// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LogConsolePanel, LoggerRegistry } from '@jupyterlab/logconsole';
import {
  standardRendererFactories as initialFactories,
  IRenderMimeRegistry,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

class SignalLogger<SENDER, ARGS> {
  constructor(signal: ISignal<SENDER, ARGS>) {
    signal.connect(this.slot, this);
  }

  slot(sender: SENDER, args: ARGS) {
    this.args.push(args);
  }

  clear() {
    this.args.length = 0;
  }

  dispose() {
    Signal.disconnectAll(this);
  }
  args: ARGS[] = [];
}

function anyAncestor(el: Element, testFn: (el: Element) => boolean) {
  while (el) {
    if (testFn(el)) {
      return true;
    }
    if (!el.parentElement || el === el.parentNode) {
      break;
    }
    el = el.parentElement;
  }
  return false;
}

function isHiddenLumino(el: Element) {
  return el.classList.contains('lm-mod-hidden');
}

describe('LogConsolePanel', () => {
  let defaultRendermime: IRenderMimeRegistry;
  let registry: LoggerRegistry;
  let logConsole: LogConsolePanel;
  beforeEach(() => {
    defaultRendermime = new RenderMimeRegistry({ initialFactories });
    registry = new LoggerRegistry({
      defaultRendermime,
      maxLength: 10
    });
    logConsole = new LogConsolePanel(registry);
  });
  afterEach(() => {
    registry.dispose();
    logConsole.dispose();
  });

  describe('#constructor()', () => {
    it('should create a console with initial parameters', () => {
      expect(logConsole).toBeInstanceOf(LogConsolePanel);
      expect(logConsole.loggerRegistry).toBe(registry);
    });
  });

  describe('#loggerRegistry', () => {
    it('returns the logger registry', () => {
      expect(logConsole.loggerRegistry).toBe(registry);
    });
  });

  describe('#source', () => {
    it('sets the current source', () => {
      expect(logConsole.source).toBe(null);
      registry.getLogger('A');
      logConsole.source = 'A';
      expect(logConsole.source).toBe('A');
    });

    it('displays output only from the current source', () => {
      const loggerA = registry.getLogger('A');
      const loggerB = registry.getLogger('B');
      loggerA.log({
        type: 'html',
        data: '<div class="A"></div>',
        level: 'warning'
      });
      loggerB.log({
        type: 'html',
        data: '<div class="B"></div>',
        level: 'warning'
      });
      logConsole.source = 'A';
      const nodeA = logConsole.node.querySelector('.A')!;
      const nodeB = logConsole.node.querySelector('.B')!;
      expect(nodeA).not.toBeNull();
      expect(anyAncestor(nodeA, isHiddenLumino)).toBe(false);
      expect(nodeB).not.toBeNull();
      expect(anyAncestor(nodeB, isHiddenLumino)).toBe(true);

      logConsole.source = 'B';
      expect(anyAncestor(nodeA, isHiddenLumino)).toBe(true);
      expect(anyAncestor(nodeB, isHiddenLumino)).toBe(false);
    });

    it('emits a source changed signal if changed', () => {
      const s = new SignalLogger(logConsole.sourceChanged);
      logConsole.source = 'A';
      logConsole.source = null;
      expect(s.args).toEqual([
        { name: 'source', oldValue: null, newValue: 'A' },
        { name: 'source', oldValue: 'A', newValue: null }
      ]);
      s.dispose();
    });

    it('has no effect if not changed', () => {
      const s = new SignalLogger(logConsole.sourceChanged);
      logConsole.source = null;
      expect(s.args).toEqual([]);

      registry.getLogger('A');
      logConsole.source = 'A';

      s.clear();
      logConsole.source = 'A';
      expect(s.args).toEqual([]);
      s.dispose();
    });
  });

  describe('#sourceVersion', () => {
    it('gives the version for the current source', () => {
      const A = registry.getLogger('A');
      A.log({ type: 'text', data: 'message', level: 'warning' });
      A.log({ type: 'text', data: 'message', level: 'warning' });
      logConsole.source = 'A';
      expect(logConsole.sourceVersion).toBe(A.version);
    });
    it('is null if the source is null', () => {
      expect(logConsole.source).toBe(null);
      expect(logConsole.sourceVersion).toBe(null);
    });
  });

  describe('#logger', () => {
    it('gives the logger for the current source', () => {
      const A = registry.getLogger('A');
      A.log({ type: 'text', data: 'message', level: 'warning' });
      A.log({ type: 'text', data: 'message', level: 'warning' });
      logConsole.source = 'A';
      expect(logConsole.logger).toBe(A);
    });
    it('is null if the source is null', () => {
      expect(logConsole.source).toBe(null);
      expect(logConsole.logger).toBe(null);
    });
  });

  describe('#sourceDisplayed', () => {
    it('emits when console is attached', () => {
      const s = new SignalLogger(logConsole.sourceDisplayed);
      const loggerA = registry.getLogger('A');
      loggerA.log({ type: 'text', data: 'A1', level: 'warning' });
      logConsole.source = 'A';
      expect(s.args).toEqual([]);

      Widget.attach(logConsole, document.body);
      expect(s.args).toEqual([{ source: 'A', version: 1 }]);
      s.dispose();
    });

    it('emits when console is shown', () => {
      const s = new SignalLogger(logConsole.sourceDisplayed);
      const loggerA = registry.getLogger('A');
      loggerA.log({ type: 'text', data: 'A1', level: 'warning' });
      logConsole.source = 'A';
      logConsole.hide();
      Widget.attach(logConsole, document.body);
      expect(s.args).toEqual([]);
      logConsole.show();
      expect(s.args).toEqual([{ source: 'A', version: 1 }]);
      s.dispose();
    });

    it('emits when source is selected', () => {
      const s = new SignalLogger(logConsole.sourceDisplayed);
      const loggerA = registry.getLogger('A');
      const loggerB = registry.getLogger('B');
      loggerA.log({ type: 'text', data: 'A1', level: 'warning' });
      loggerB.log({ type: 'text', data: 'B1', level: 'warning' });
      Widget.attach(logConsole, document.body);
      expect(s.args).toEqual([]);

      logConsole.source = 'A';
      expect(s.args).toEqual([{ source: 'A', version: 1 }]);
      s.clear();

      loggerB.log({ type: 'text', data: 'B2', level: 'warning' });
      expect(s.args).toEqual([]);
      logConsole.source = 'B';
      expect(s.args).toEqual([{ source: 'B', version: 2 }]);
      s.dispose();
    });

    it('emits when logging to displayed source', () => {
      const s = new SignalLogger(logConsole.sourceDisplayed);
      const loggerA = registry.getLogger('A');
      loggerA.log({ type: 'text', data: 'A1', level: 'warning' });
      Widget.attach(logConsole, document.body);
      expect(s.args).toEqual([]);

      logConsole.source = 'A';
      expect(s.args).toEqual([{ source: 'A', version: 1 }]);
      s.clear();

      loggerA.log({ type: 'text', data: 'A2', level: 'warning' });
      expect(s.args).toEqual([{ source: 'A', version: 2 }]);
      s.dispose();
    });
  });
});
