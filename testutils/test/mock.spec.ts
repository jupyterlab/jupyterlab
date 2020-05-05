// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import * as Mock from '../src/mock';
import { KernelMessage } from '@jupyterlab/services';
import { toArray } from '@lumino/algorithm';

describe('mock', () => {
  describe('createSimpleSessionContext()', () => {
    it('should create a session context', () => {
      const context = Mock.createSimpleSessionContext();
      expect(context.session!.kernel!.name).toEqual(Mock.DEFAULT_NAME);
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

  describe('cloneKernel()', () => {
    it('should clone a kernel', () => {
      const kernel0 = new Mock.KernelMock({});
      const kernel1 = Mock.cloneKernel(kernel0);
      expect(kernel0.id).toBe(kernel1.id);
      expect(kernel0.clientId).not.toBe(kernel1.clientId);
    });
  });

  describe('KernelMock', () => {
    describe('.constructor()', () => {
      it('should create a mock kernel', () => {
        const kernel = new Mock.KernelMock({});
        expect(kernel.name).toBe(Mock.DEFAULT_NAME);
      });

      it('should take options', () => {
        const kernel = new Mock.KernelMock({ model: { name: 'foo' } });
        expect(kernel.name).toBe('foo');
      });
    });

    describe('.spec()', () => {
      it('should resolve with a kernel spec', async () => {
        const kernel = new Mock.KernelMock({});
        const spec = await kernel.spec;
        expect(spec!.name).toBe(Mock.DEFAULT_NAME);
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const kernel = new Mock.KernelMock({});
        kernel.dispose();
      });
    });

    describe('.clone()', () => {
      it('should clone the kernel', () => {
        const kernel0 = new Mock.KernelMock({});
        const kernel1 = kernel0.clone();
        expect(kernel0.id).toBe(kernel1.id);
        expect(kernel0.clientId).not.toBe(kernel1.clientId);
      });
    });

    describe('.info', () => {
      it('should resolve with info', async () => {
        const kernel = new Mock.KernelMock({});
        const info = await kernel.info;
        expect(info.language_info.name).toBe(Mock.DEFAULT_NAME);
      });
    });

    describe('.shutdown()', () => {
      it('should be a no-op', async () => {
        const kernel = new Mock.KernelMock({});
        await kernel.shutdown();
      });
    });

    describe('.requestHistory()', () => {
      it('should get the history info', async () => {
        const kernel = new Mock.KernelMock({});
        const reply = await kernel.requestHistory({} as any);
        expect(reply.content.status).toBe('ok');
      });
    });

    describe('.restart()', () => {
      it('should be a no-op', async () => {
        const kernel = new Mock.KernelMock({});
        await kernel.restart();
      });
    });

    describe('.requestExecute()', () => {
      it('should request execution', async () => {
        const kernel = new Mock.KernelMock({});
        let called = false;
        kernel.iopubMessage.connect((_, msg) => {
          if (msg.header.msg_type === 'execute_input') {
            called = true;
          }
        });
        const future = kernel.requestExecute({ code: 'foo ' });
        await future.done;
        expect(called).toBe(true);
      });
    });
  });

  describe('SessionConnectionMock', () => {
    describe('.constructor()', () => {
      it('should create a new SessionConnectionMock', () => {
        const session = new Mock.SessionConnectionMock({}, null);
        expect(session.kernel!.name).toBe(Mock.DEFAULT_NAME);
      });

      it('should take options', () => {
        const kernel = new Mock.KernelMock({});
        const session = new Mock.SessionConnectionMock(
          { model: { name: 'foo' } },
          kernel
        );
        expect(session.kernel).toBe(kernel);
        expect(session.name).toBe('foo');
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const session = new Mock.SessionConnectionMock({}, null);
        session.dispose();
      });
    });

    describe('.changeKernel()', () => {
      it('should change the kernel', async () => {
        const session = new Mock.SessionConnectionMock({}, null);
        const oldId = session.kernel!.id;
        const kernel = await session.changeKernel({ name: Mock.DEFAULT_NAME });
        expect(kernel!.id).not.toBe(oldId);
      });
    });

    describe('.shutdown()', () => {
      it('should be a no-op', async () => {
        const session = new Mock.SessionConnectionMock({}, null);
        await session.shutdown();
      });
    });

    describe('.setPath()', () => {
      it('should set the path', async () => {
        const session = new Mock.SessionConnectionMock({}, null);
        let called = false;
        session.propertyChanged.connect((_, args) => {
          if (args === 'path') {
            called = true;
          }
        });
        await session.setPath('foo');
        expect(session.path).toBe('foo');
        expect(called).toBe(true);
      });
    });

    describe('.setType()', () => {
      it('should set the type', async () => {
        const session = new Mock.SessionConnectionMock({}, null);
        let called = false;
        session.propertyChanged.connect((_, args) => {
          if (args === 'type') {
            called = true;
          }
        });
        await session.setType('foo');
        expect(session.type).toBe('foo');
        expect(called).toBe(true);
      });
    });

    describe('.setName()', () => {
      it('should set the name', async () => {
        const session = new Mock.SessionConnectionMock({}, null);
        let called = false;
        session.propertyChanged.connect((_, args) => {
          if (args === 'name') {
            called = true;
          }
        });
        await session.setName('foo');
        expect(session.name).toBe('foo');
        expect(called).toBe(true);
      });
    });
  });

  describe('SessionContextMock', () => {
    describe('.constructor()', () => {
      it('should create a new context', () => {
        const context = new Mock.SessionContextMock({}, null);
        expect(context.session!.kernel!.name).toBe(Mock.DEFAULT_NAME);
      });

      it('should accept options', () => {
        const session = new Mock.SessionConnectionMock({}, null);
        const context = new Mock.SessionContextMock({ path: 'foo' }, session);
        expect(context.session).toBe(session);
        expect(context.path).toBe('foo');
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const context = new Mock.SessionContextMock({}, null);
        context.dispose();
      });
    });

    describe('.initialize()', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await context.initialize();
      });
    });

    describe('.ready', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await context.ready;
      });
    });

    describe('.changeKernel()', () => {
      it('should change the kernel', async () => {
        const context = new Mock.SessionContextMock({}, null);
        const oldId = context.session!.kernel!.id;
        const kernel = await context.changeKernel({ name: Mock.DEFAULT_NAME });
        expect(kernel!.id).not.toBe(oldId);
      });
    });

    describe('.shutdown()', () => {
      it('should be a no-op', async () => {
        const context = new Mock.SessionContextMock({}, null);
        await context.shutdown();
      });
    });
  });

  describe('ContentsManagerMock', () => {
    describe('.constructor()', () => {
      it('should create a new mock', () => {
        const manager = new Mock.ContentsManagerMock();
        expect(manager.localPath('foo')).toBe('foo');
      });
    });

    describe('.newUntitled', () => {
      it('should create a new text file', async () => {
        const manager = new Mock.ContentsManagerMock();
        let called = false;
        manager.fileChanged.connect((_, args) => {
          if (args.type === 'new') {
            called = true;
          }
        });
        const contents = await manager.newUntitled();
        expect(contents.type).toBe('file');
        expect(called).toBe(true);
      });

      it('should create a new notebook', async () => {
        const manager = new Mock.ContentsManagerMock();
        const contents = await manager.newUntitled({ type: 'notebook' });
        expect(contents.type).toBe('notebook');
      });
    });

    describe('.createCheckpoint()', () => {
      it('should create a checkpoint', async () => {
        const manager = new Mock.ContentsManagerMock();
        const content = await manager.newUntitled();
        const checkpoint = await manager.createCheckpoint(content.path);
        expect(checkpoint.id).toBeTruthy();
      });
    });

    describe('.listCheckpoints()', () => {
      it('should list the checkpoints', async () => {
        const manager = new Mock.ContentsManagerMock();
        const content = await manager.newUntitled();
        const checkpoint = await manager.createCheckpoint(content.path);
        const checkpoints = await manager.listCheckpoints(content.path);
        expect(checkpoints[0].id).toBe(checkpoint.id);
      });
    });

    describe('.deleteCheckpoint', () => {
      it('should delete a checkpoints', async () => {
        const manager = new Mock.ContentsManagerMock();
        const content = await manager.newUntitled();
        const checkpoint = await manager.createCheckpoint(content.path);
        await manager.deleteCheckpoint(content.path, checkpoint.id);
        const checkpoints = await manager.listCheckpoints(content.path);
        expect(checkpoints.length).toBe(0);
      });
    });

    describe('.restoreCheckpoint()', () => {
      it('should restore the contents', async () => {
        const manager = new Mock.ContentsManagerMock();
        const content = await manager.newUntitled();
        await manager.save(content.path, { content: 'foo' });
        const checkpoint = await manager.createCheckpoint(content.path);
        await manager.save(content.path, { content: 'bar' });
        await manager.restoreCheckpoint(content.path, checkpoint.id);
        const newContent = await manager.get(content.path);
        expect(newContent.content).toBe('foo');
      });
    });

    describe('.getModelDBFactory()', () => {
      it('should return null', () => {
        const manager = new Mock.ContentsManagerMock();
        expect(manager.getModelDBFactory('foo')).toBe(null);
      });
    });

    describe('.normalize()', () => {
      it('should normalize a path', () => {
        const manager = new Mock.ContentsManagerMock();
        expect(manager.normalize('foo/bar/../baz')).toBe('foo/baz');
      });
    });

    describe('.localPath', () => {
      it('should get the local path of a file', () => {
        const manager = new Mock.ContentsManagerMock();
        const defaultDrive = manager.driveName('foo');
        expect(manager.localPath(`${defaultDrive}foo/bar`)).toBe('foo/bar');
      });
    });

    describe('.get()', () => {
      it('should get the file contents', async () => {
        const manager = new Mock.ContentsManagerMock();
        const content = await manager.newUntitled();
        await manager.save(content.path, { content: 'foo' });
        const newContent = await manager.get(content.path);
        expect(newContent.content).toBe('foo');
      });
    });

    describe('.driveName()', () => {
      it('should get the drive name of the path', () => {
        const manager = new Mock.ContentsManagerMock();
        const defaultDrive = manager.driveName('foo');
        expect(manager.driveName(`${defaultDrive}/bar`)).toBe(defaultDrive);
      });
    });

    describe('.rename()', () => {
      it('should rename the file', async () => {
        const manager = new Mock.ContentsManagerMock();
        let called = false;
        manager.fileChanged.connect((_, args) => {
          if (args.type === 'rename') {
            expect(args.newValue!.path).toBe('foo');
            called = true;
          }
        });
        const contents = await manager.newUntitled();
        await manager.rename(contents.path, 'foo');
        expect(called).toBe(true);
      });
    });

    describe('.delete()', () => {
      it('should delete the file', async () => {
        const manager = new Mock.ContentsManagerMock();
        let called = false;
        manager.fileChanged.connect((_, args) => {
          if (args.type === 'delete') {
            expect(args.newValue).toBe(null);
            called = true;
          }
        });
        const contents = await manager.newUntitled();
        await manager.delete(contents.path);
        expect(called).toBe(true);
      });
    });

    describe('.save()', () => {
      it('should save the file', async () => {
        const manager = new Mock.ContentsManagerMock();
        let called = false;
        manager.fileChanged.connect((_, args) => {
          if (args.type === 'save') {
            expect(args.newValue!.content).toBe('bar');
            called = true;
          }
        });
        const contents = await manager.newUntitled();
        await manager.save(contents.path, { content: 'bar' });
        expect(called).toBe(true);
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const manager = new Mock.ContentsManagerMock();
        manager.dispose();
      });
    });
  });

  describe('SessionManagerMock', () => {
    describe('.constructor()', () => {
      it('should create a new session manager', () => {
        const manager = new Mock.SessionManagerMock();
        expect(manager.isReady).toBe(true);
      });
    });

    describe('.startNew()', () => {
      it('should start a new session', async () => {
        const manager = new Mock.SessionManagerMock();
        const session = await manager.startNew({
          path: 'foo',
          name: 'foo',
          type: 'bar',
          kernel: { name: Mock.DEFAULT_NAME }
        });
        expect(session.kernel!.name).toBe(Mock.DEFAULT_NAME);
      });
    });

    describe('.connectTo()', () => {
      it('should connect to a session', async () => {
        const manager = new Mock.SessionManagerMock();
        const session = await manager.connectTo({
          model: {
            id: 'fizz',
            path: 'foo',
            type: 'bar',
            name: 'baz',
            kernel: { name: Mock.DEFAULT_NAME, id: 'fuzz' }
          }
        });
        expect(session.kernel!.name).toBe(Mock.DEFAULT_NAME);
      });
    });

    describe('.stopIfNeeded()', () => {
      it('should remove a running kernel', async () => {
        const manager = new Mock.SessionManagerMock();
        const session = await manager.startNew({
          path: 'foo',
          name: 'foo',
          type: 'bar',
          kernel: { name: Mock.DEFAULT_NAME }
        });
        expect(toArray(manager.running()).length).toBe(1);
        await manager.stopIfNeeded(session.path);
        expect(toArray(manager.running()).length).toBe(0);
      });
    });

    describe('.refreshRunning()', () => {
      it('should be a no-op', async () => {
        const manager = new Mock.SessionManagerMock();
        await manager.refreshRunning();
      });
    });

    describe('.running()', () => {
      it('should be an iterable of running sessions', async () => {
        const manager = new Mock.SessionManagerMock();
        await manager.startNew({
          path: 'foo',
          name: 'foo',
          type: 'bar',
          kernel: { name: Mock.DEFAULT_NAME }
        });
        expect(toArray(manager.running()).length).toBe(1);
      });
    });
  });

  describe('KernelSpecManagerMock', () => {
    describe('.constructor', () => {
      it('should create a new mock', () => {
        const manager = new Mock.KernelSpecManagerMock();
        expect(manager.isReady).toBe(true);
      });
    });

    describe('.specs', () => {
      it('should be the kernel specs', () => {
        const manager = new Mock.KernelSpecManagerMock();
        expect(manager.specs!.default).toBe(Mock.DEFAULT_NAME);
      });
    });

    describe('.refreshSpecs()', () => {
      it('should be a no-op', async () => {
        const manager = new Mock.KernelSpecManagerMock();
        await manager.refreshSpecs();
      });
    });
  });

  describe('ServiceManagerMock', () => {
    describe('.constructor()', () => {
      it('should create a new mock', () => {
        const manager = new Mock.ServiceManagerMock();
        expect(manager.isReady).toBe(true);
      });
    });

    describe('.ready', () => {
      it('should resolve', async () => {
        const manager = new Mock.ServiceManagerMock();
        await manager.ready;
      });
    });

    describe('.contents', () => {
      it('should be a contents manager', () => {
        const manager = new Mock.ServiceManagerMock();
        expect(manager.contents.normalize).toBeTruthy();
      });
    });

    describe('.sessions', () => {
      it('should be a sessions manager', () => {
        const manager = new Mock.ServiceManagerMock();
        expect(manager.sessions.isReady).toBe(true);
      });
    });

    describe('.kernelspecs', () => {
      it('should be a kernelspecs manager', () => {
        const manager = new Mock.ServiceManagerMock();
        expect(manager.kernelspecs.isReady).toBe(true);
      });
    });

    describe('.dispose()', () => {
      it('should be a no-op', () => {
        const manager = new Mock.ServiceManagerMock();
        manager.dispose();
      });
    });
  });

  describe('MockShellFuture', () => {
    it('should create a new mock', async () => {
      const msg = KernelMessage.createMessage({
        channel: 'shell',
        msgType: 'execute_reply',
        session: 'foo',
        username: 'bar',
        msgId: 'fizz',
        content: {
          user_expressions: {},
          execution_count: 0,
          status: 'ok'
        }
      });
      const future = new Mock.MockShellFuture(msg);
      const reply = await future.done;
      expect(reply).toBe(msg);
      future.dispose();
    });
  });

  describe('createFileContext()', () => {
    it('should create a context without a kernel', async () => {
      const context = await Mock.createFileContext();
      expect(context.sessionContext.session).toBe(null);
    });

    it('should create a context with a kernel', async () => {
      const context = await Mock.createFileContext(true);
      expect(context.sessionContext.session!.kernel!.name).toBe(
        Mock.DEFAULT_NAME
      );
    });
  });
});
