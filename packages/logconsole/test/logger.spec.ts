// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILogPayload,
  Logger,
  LoggerOutputAreaModel,
  LogLevel
} from '@jupyterlab/logconsole';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
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

describe('LoggerOutputAreaModel', () => {
  let model: LoggerOutputAreaModel;
  beforeEach(() => {
    model = new LoggerOutputAreaModel({ maxLength: 10 });
  });
  afterEach(() => {
    model.dispose();
  });

  describe('#constructor()', () => {
    it('should create an LoggerOutputAreaModel', () => {
      expect(model).toBeInstanceOf(LoggerOutputAreaModel);
    });

    it('should set the max length', async () => {
      const model = new LoggerOutputAreaModel({ maxLength: 10 });
      expect(model.maxLength).toEqual(10);
      model.dispose();
    });
  });

  describe('#maxLength', () => {
    it('should set the maximum number of messages in the first-in first-out queue', () => {
      for (let i = 0; i < 12; i++) {
        model.add({
          output_type: 'display_data',
          data: { 'text/plain': i.toString() },
          timestamp: Date.now(),
          level: 'info'
        });
      }
      expect(model.length).toEqual(10);
      expect(model.get(0).data['text/plain']).toEqual('2');
    });

    it('setting maxLength should immediately apply and trim the message list', () => {
      for (let i = 0; i < 12; i++) {
        model.add({
          output_type: 'display_data',
          data: { 'text/plain': i.toString() },
          timestamp: Date.now(),
          level: 'info'
        });
      }
      expect(model.maxLength).toEqual(10);
      expect(model.length).toEqual(10);
      model.maxLength = 5;
      expect(model.maxLength).toEqual(5);
      expect(model.length).toEqual(5);
      expect(model.get(0).data['text/plain']).toEqual('7');
    });
  });
});

describe('Logger', () => {
  let logger: Logger;
  beforeEach(() => {
    logger = new Logger({ source: 'test source', maxLength: 10 });
  });
  afterEach(() => {
    logger.dispose();
  });

  describe('#constructor()', () => {
    it('should create a Logger with initial properties', () => {
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.source).toEqual('test source');
      expect(logger.maxLength).toEqual(10);
    });
  });

  describe('#maxLength', () => {
    it('should set the maximum number of messages in the first-in first-out queue', () => {
      for (let i = 0; i < 12; i++) {
        logger.log({ type: 'text', data: i.toString(), level: 'critical' });
      }
      expect(logger.length).toEqual(10);
      expect(logger.outputAreaModel.get(0).data['text/plain']).toEqual('2');
    });

    it('setting maxLength should immediately apply and trim the message list', () => {
      for (let i = 0; i < 12; i++) {
        logger.log({ type: 'text', data: i.toString(), level: 'critical' });
      }
      const model = logger.outputAreaModel;
      expect(logger.maxLength).toEqual(10);
      expect(logger.length).toEqual(10);
      logger.maxLength = 5;
      expect(logger.maxLength).toEqual(5);
      expect(logger.length).toEqual(5);
      expect(model.get(0).data['text/plain']).toEqual('7');
    });
  });

  describe('#level', () => {
    const levels: LogLevel[] = [
      'critical',
      'error',
      'warning',
      'info',
      'debug'
    ];
    it('should default to "warning"', () => {
      expect(logger.level).toEqual('warning');
    });

    it.each(levels)('filters for messages: %s', (level: LogLevel) => {
      logger.level = level;
      const messages: ILogPayload[] = levels.map(level => ({
        type: 'text',
        data: level,
        level
      }));
      messages.forEach(m => logger.log({ ...m }));
      const logged: string[] = [];
      for (let i = 0; i < logger.length; i++) {
        const msg = logger.outputAreaModel.get(i);
        logged.push(msg.level);
      }
      const shouldInclude = levels.slice(0, levels.indexOf(level) + 1);
      const shouldExclude = levels.slice(levels.indexOf(level) + 1);
      shouldInclude.forEach(x => {
        expect(logged).toContain(x);
      });
      shouldExclude.forEach(x => {
        expect(logged).not.toContain(x);
      });
    });

    it('logs a "metadata" level text message if changed', () => {
      logger.level = 'info';
      const msg = logger.outputAreaModel.get(0);
      expect(msg.level).toBe('metadata');
      expect(msg.data['text/plain']).toContain('info');
    });

    it('emits a stateChanged signal when changing', () => {
      const s = new SignalLogger(logger.stateChanged);
      logger.level = 'info';
      expect(s.args).toEqual([
        {
          name: 'level',
          oldValue: 'warning',
          newValue: 'info'
        }
      ]);
      s.dispose();
    });

    it('setting to its current value has no effect', () => {
      const s = new SignalLogger(logger.stateChanged);
      logger.level = logger.level; // eslint-disable-line
      expect(s.args.length).toBe(0);
      expect(logger.length).toBe(0);
      s.dispose();
    });
  });

  describe('#length', () => {
    it('records how many messages are stored', () => {
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      logger.log({ type: 'text', data: 'message 2', level: 'warning' });
      expect(logger.length).toBe(2);
      logger.clear();
      expect(logger.length).toBe(0);
    });

    it('may be less than the messages logged if messages were combined', () => {
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 1' },
        level: 'critical'
      });
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 2' },
        level: 'critical'
      });
      expect(logger.length).toBe(1);
    });
  });

  describe('#rendermime', () => {
    it('initially is null', () => {
      expect(logger.rendermime).toBe(null);
    });

    it('sets the rendermime attribute', () => {
      const value = new RenderMimeRegistry();
      logger.rendermime = value;
      expect(logger.rendermime).toBe(value);
    });

    it('emits a stateChanged signal when changed', () => {
      const oldValue = (logger.rendermime = new RenderMimeRegistry());
      const newValue = oldValue.clone();
      const s = new SignalLogger(logger.stateChanged);
      logger.rendermime = newValue;
      expect(s.args).toEqual([{ name: 'rendermime', oldValue, newValue }]);
      s.dispose();
    });

    it('setting to current value has no effect', () => {
      logger.rendermime = new RenderMimeRegistry();
      const s = new SignalLogger(logger.stateChanged);
      logger.rendermime = logger.rendermime; // eslint-disable-line
      expect(s.args).toEqual([]);
      s.dispose();
    });
  });

  describe('#version', () => {
    it('starts at zero', () => {
      expect(logger.version).toBe(0);
    });

    it('increments every time a message is logged', () => {
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      logger.log({ type: 'text', data: 'message 2', level: 'warning' });
      expect(logger.version).toBe(2);
    });

    it('increments even if messages are combined', () => {
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 1' },
        level: 'critical'
      });
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 2' },
        level: 'critical'
      });
      expect(logger.length).toBe(1);
      expect(logger.version).toBe(2);
    });

    it('does not increment on clearing messages', () => {
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      logger.log({ type: 'text', data: 'message 2', level: 'warning' });
      expect(logger.version).toBe(2);
      logger.clear();
      expect(logger.length).toBe(0);
      expect(logger.version).toBe(2);
    });
  });

  describe('#log()', () => {
    it('logs text messages', () => {
      logger.log({ type: 'text', data: 'message', level: 'warning' });
      expect(logger.length).toBe(1);
    });

    it('logs html messages', () => {
      logger.log({ type: 'html', data: 'message', level: 'warning' });
      expect(logger.length).toBe(1);
    });

    it('logs output stream messages', () => {
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message' },
        level: 'warning'
      });
      expect(logger.length).toBe(1);
    });

    it('logs display_data messages', () => {
      logger.log({
        type: 'output',
        data: {
          output_type: 'display_data',
          data: { 'text/plain': 'message' }
        },
        level: 'warning'
      });
      expect(logger.length).toBe(1);
    });

    it('logs execute_result messages', () => {
      logger.log({
        type: 'output',
        data: {
          output_type: 'execute_result',
          data: { 'text/plain': 'message', execution_count: 5 }
        },
        level: 'warning'
      });
      expect(logger.length).toBe(1);
    });

    it('logs error messages', () => {
      logger.log({
        type: 'output',
        data: {
          output_type: 'error',
          ename: 'Error',
          evalue: 'Error',
          traceback: ['level 1', 'level 2']
        },
        level: 'warning'
      });
      expect(logger.length).toBe(1);
    });

    it('emits an "append" content changed signal', () => {
      const s = new SignalLogger(logger.contentChanged);
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      expect(s.args).toEqual(['append']);
      s.dispose();
    });

    it('emits an "append" content changed signal and log outputs', () => {
      const s = new SignalLogger(logger.contentChanged);
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 1' },
        level: 'critical'
      });
      logger.log({
        type: 'output',
        data: { output_type: 'stream', name: 'stdout', text: 'message 2' },
        level: 'critical'
      });
      expect(s.args).toEqual(['append', 'append']);
      expect(logger.length).toBe(1);
      s.dispose();
    });

    it('adds a timestamp to the message', () => {
      const before = Date.now();
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      const after = Date.now();
      const msgTime = logger.outputAreaModel.get(0).timestamp.getTime();
      expect(msgTime).toBeGreaterThanOrEqual(before);
      expect(msgTime).toBeLessThanOrEqual(after);
    });
  });

  describe('#clear()', () => {
    it('clears messages', () => {
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      logger.log({ type: 'text', data: 'message 2', level: 'warning' });
      expect(logger.length).toBe(2);
      logger.clear();
      expect(logger.length).toBe(0);
    });

    it('emits a "clear" content changed signal', () => {
      const s = new SignalLogger(logger.contentChanged);
      logger.log({ type: 'text', data: 'message 1', level: 'warning' });
      logger.clear();
      expect(s.args).toEqual(['append', 'clear']);
      s.dispose();
    });
  });

  describe('#checkpoint()', () => {
    it('adds a metadata message to the message list', () => {
      logger.checkpoint();
      expect(logger.outputAreaModel.get(0).level).toBe('metadata');
    });

    it('emits an "append" content changed signal', () => {
      const s = new SignalLogger(logger.contentChanged);
      logger.checkpoint();
      expect(s.args).toEqual(['append']);
      s.dispose();
    });
  });
});
