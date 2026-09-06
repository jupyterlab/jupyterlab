// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Mock from '@jupyterlab/docregistry/lib/testutils';
import { KernelMessage } from '@jupyterlab/services';
import {
  DEFAULT_NAME,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';

describe('mock', () => {
  describe('createSimpleSessionContext()', () => {
    it('should create a session context', () => {
      const context = Mock.createSimpleSessionContext();
      expect(context.session!.kernel!.name).toEqual(DEFAULT_NAME);
    });

    it('should accept a session model', () => {
      const context = Mock.createSimpleSessionContext({
        name: 'hi',
        path: 'foo',
        type: 'bar',
        kernel: { name: 'fizz' }
      });
      expect(context.name).toEqual('hi');
      expect(context.path).toEqual('foo');
      expect(context.type).toEqual('bar');
      expect(context.session!.kernel!.name).toEqual('fizz');
    });
  });

  describe('updateKernelStatus()', () => {
    it('should update the kernel status', () => {
      const context = Mock.createSimpleSessionContext();
      let called = false;
      context.statusChanged.connect((_, status) => {
        if (status === 'dead') {
          called = true;
        }
      });
      Mock.updateKernelStatus(context, 'dead');
      expect(context.session!.kernel!.status).toEqual('dead');
      expect(called).toEqual(true);
    });
  });

  describe('emitIopubMessage', () => {
    it('should emit an iopub message', () => {
      const context = Mock.createSimpleSessionContext();
      const source = KernelMessage.createMessage({
        channel: 'iopub',
        msgType: 'execute_input',
        session: 'foo',
        username: 'bar',
        msgId: 'fizz',
        content: {
          code: 'hello, world!',
          execution_count: 0
        }
      });
      let called = false;
      context.iopubMessage.connect((_, msg) => {
        expect(msg).toBe(source);
        called = true;
      });
      Mock.emitIopubMessage(context, source);
      expect(called).toBe(true);
    });
  });

  describe('SessionContextMock', () => {
    describe('.constructor()', () => {
      it('should create a new context', () => {
        const context = new Mock.SessionContextMock({}, null);
        expect(context.session!.kernel!.name).toBe(DEFAULT_NAME);
      });

      it('should accept options', () => {
        const session = new SessionConnectionMock({}, null);
        const context = new Mock.SessionContextMock({ path: 'foo' }, session);
        expect(context.session).toBe(session);
        expect(context.path).toBe('foo');
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const context = new Mock.SessionContextMock({}, null);
        expect(() => {
          context.dispose();
        }).not.toThrow();
      });
    });

    describe('.initialize()', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await expect(context.initialize()).resolves.not.toThrow();
      });
    });

    describe('.ready', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await expect(context.ready).resolves.not.toThrow();
      });
    });

    describe('.changeKernel()', () => {
      it('should change the kernel', async () => {
        const context = new Mock.SessionContextMock({}, null);
        const oldId = context.session!.kernel!.id;
        const kernel = await context.changeKernel({ name: DEFAULT_NAME });
        expect(kernel!.id).not.toBe(oldId);
      });
    });

    describe('.shutdown()', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await expect(context.shutdown()).resolves.not.toThrow();
      });
    });
  });

  describe('createFileContext()', () => {
    it('should create a context without a kernel', async () => {
      const context = await Mock.createFileContextWithMockedServices();
      expect(context.sessionContext.session).toBe(null);
    });

    it('should create a context with a kernel', async () => {
      const context = await Mock.createFileContextWithMockedServices(true);
      expect(context.sessionContext.session!.kernel!.name).toBe(DEFAULT_NAME);
    });
  });
});
