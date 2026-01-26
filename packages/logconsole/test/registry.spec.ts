// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LoggerRegistry } from '@jupyterlab/logconsole';
import {
  IRenderMimeRegistry,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';
import { ISignal, Signal } from '@lumino/signaling';

class SignalLogger<SENDER, ARGS> {
  constructor(signal: ISignal<SENDER, ARGS>) {
    signal.connect(this.slot, this);
  }

  slot(sender: SENDER, args: ARGS) {
    this.args.push(args);
  }

  dispose() {
    Signal.disconnectAll(this);
  }
  args: ARGS[] = [];
}

describe('LoggerRegistry', () => {
  let defaultRendermime: IRenderMimeRegistry;
  let registry: LoggerRegistry;
  beforeEach(() => {
    defaultRendermime = new RenderMimeRegistry();
    registry = new LoggerRegistry({
      defaultRendermime,
      maxLength: 10
    });
  });

  afterEach(() => {
    registry.dispose();
  });

  describe('#constructor()', () => {
    it('should create a registry with initial parameters', () => {
      expect(registry).toBeInstanceOf(LoggerRegistry);
      expect(registry.maxLength).toBe(10);
    });

    it('should use "warning" as the default log level if not specified', () => {
      expect(registry.defaultLogLevel).toBe('warning');
    });

    it('should use the provided default log level if specified', () => {
      const customRegistry = new LoggerRegistry({
        defaultRendermime,
        maxLength: 10,
        defaultLogLevel: 'info'
      });
      expect(customRegistry.defaultLogLevel).toBe('info');
      customRegistry.dispose();
    });
  });

  describe('#getLogger()', () => {
    it('gets a specific logger', () => {
      const A = registry.getLogger('A');
      const B = registry.getLogger('B');
      expect(registry.getLogger('A')).toEqual(A);
      expect(registry.getLogger('B')).toEqual(B);
    });
    it('creates a new logger on demand if needed with default parameters', () => {
      const A = registry.getLogger('A');
      expect(A.rendermime).toBe(defaultRendermime);
      expect(A.maxLength).toBe(registry.maxLength);
    });
    it('emits a registry changed "append" signal', () => {
      const s = new SignalLogger(registry.registryChanged);
      registry.getLogger('A');
      expect(s.args).toEqual(['append']);
      s.dispose();
    });
  });

  describe('#getLoggers', () => {
    it('gets all current loggers', () => {
      const A = registry.getLogger('A');
      expect(registry.getLoggers()).toEqual([A]);
    });
  });

  describe('#maxLength', () => {
    it('overrides the max length for all loggers', () => {
      const A = registry.getLogger('A');
      const B = registry.getLogger('B');
      A.maxLength = 5;
      B.maxLength = 20;
      expect(A.maxLength).toEqual(5);
      expect(B.maxLength).toEqual(20);
      registry.maxLength = 12;
      expect(A.maxLength).toEqual(12);
      expect(B.maxLength).toEqual(12);
    });
  });

  describe('#defaultLogLevel', () => {
    it('should be applied to newly created loggers', () => {
      const A = registry.getLogger('A');
      expect(A.level).toBe(registry.defaultLogLevel);
    });

    it('should only affect loggers created after it is changed', () => {
      const A = registry.getLogger('A');
      expect(A.level).toBe('warning');

      registry.defaultLogLevel = 'info';
      expect(registry.defaultLogLevel).toBe('info');

      // A's level should not be changed
      expect(A.level).toBe('warning');

      // B should get the new default
      const B = registry.getLogger('B');
      expect(B.level).toBe('info');
    });
  });
});
