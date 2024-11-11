// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { ServiceManager } from '@jupyterlab/services';
import {
  acceptDialog,
  signalToPromise,
  testEmission,
  waitForDialog
} from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { PromiseDelegate, UUID } from '@lumino/coreutils';
import { SaveHandler } from '../src';

describe('docregistry/savehandler', () => {
  let manager: ServiceManager.IManager;
  const factory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let handler: SaveHandler;

  beforeAll(() => {
    manager = new ServiceManagerMock();
  });

  beforeEach(() => {
    context = new Context({
      manager,
      factory,
      path: UUID.uuid4() + '.txt'
    });
    handler = new SaveHandler({ context });
    return context.initialize(true);
  });

  afterEach(() => {
    context.dispose();
    handler.dispose();
  });

  describe('SaveHandler', () => {
    describe('#constructor()', () => {
      it('should create a new save handler', () => {
        expect(handler).toBeInstanceOf(SaveHandler);
      });
    });

    describe('#saveInterval()', () => {
      it('should be the save interval of the handler', () => {
        expect(handler.saveInterval).toBe(120);
      });

      it('should be set-able', () => {
        handler.saveInterval = 200;
        expect(handler.saveInterval).toBe(200);
      });
    });

    describe('#isActive', () => {
      it('should test whether the handler is active', () => {
        expect(handler.isActive).toBe(false);
        handler.start();
        expect(handler.isActive).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the handler is disposed', () => {
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });

      it('should be true after the context is disposed', () => {
        context.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the handler', () => {
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#start()', () => {
      it('should start the save handler', () => {
        handler.start();
        expect(handler.isActive).toBe(true);
      });

      it('should trigger a save', () => {
        const promise = signalToPromise(context.fileChanged);
        context.model.fromString('bar');
        expect(handler.isActive).toBe(false);
        handler.saveInterval = 0.1;
        handler.start();
        return promise;
      });

      it('should continue to save', async () => {
        let called = 0;
        // Lower the duration multiplier.
        (handler as any)._multiplier = 1;
        const promise = testEmission(context.fileChanged, {
          find: () => {
            called++;
            if (called === 1) {
              context.model.fromString('bar');
            }
            return called === 2;
          }
        });
        context.model.fromString('foo');
        expect(handler.isActive).toBe(false);
        handler.saveInterval = 0.1;
        handler.start();
        return promise;
      });

      it('should continue to save after being disconnected', async () => {
        jest.useFakeTimers();
        handler.saveInterval = 120;
        handler.start();

        context.model.fromString('foo');
        jest.advanceTimersByTime(120000); // in ms
        await signalToPromise(context.fileChanged);

        jest
          .spyOn(handler as any, '_isConnectedCallback')
          .mockReturnValue(false);
        context.model.fromString('bar');
        jest.advanceTimersByTime(240000);
        jest
          .spyOn(handler as any, '_isConnectedCallback')
          .mockReturnValue(true);

        jest.advanceTimersByTime(120000);
        jest.useRealTimers();
        return signalToPromise(context.fileChanged);
      });

      it('should overwrite the file on disk', async () => {
        const delegate = new PromiseDelegate();

        // Lower the duration multiplier.
        (handler as any)._multiplier = 1;
        context.model.fromString('foo');
        await context.initialize(true);

        // The context allows up to 0.5 difference in timestamps before complaining.
        setTimeout(async () => {
          await manager.contents.save(context.path, {
            type: factory.contentType,
            format: factory.fileFormat,
            content: 'bar'
          });
          handler.saveInterval = 1;
          handler.start();
          context.model.fromString('baz');
          context.fileChanged.connect(() => {
            expect(context.model.toString()).toBe('baz');
            delegate.resolve(undefined);
          });
        }, 1500);

        // Extend the timeout to wait for the dialog because of the setTimeout.
        await acceptDialog(document.body, 3000);
        await delegate.promise;
      });

      it('should revert to the file on disk', async () => {
        const delegate = new PromiseDelegate();
        const revert = () => {
          const dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          const buttons = dialog.getElementsByTagName('button');

          for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Revert') {
              buttons[i].click();
              return;
            }
          }
        };

        // Lower the duration multiplier.
        (handler as any)._multiplier = 1;

        await context.initialize(true);
        context.model.fromString('foo');
        context.fileChanged.connect(() => {
          expect(context.model.toString()).toBe('bar');
          delegate.resolve(undefined);
        });

        // The context allows up to 0.5 difference in timestamps before complaining.
        setTimeout(async () => {
          await manager.contents.save(context.path, {
            type: factory.contentType,
            format: factory.fileFormat,
            content: 'bar'
          });
          handler.saveInterval = 1;
          handler.start();
          context.model.fromString('baz');
        }, 1500);

        // Extend the timeout to wait for the dialog because of the setTimeout.
        await waitForDialog(document.body, 3000);
        revert();
        await delegate.promise;
      });
    });

    describe('#stop()', () => {
      it('should stop the save timer', () => {
        handler.start();
        expect(handler.isActive).toBe(true);
        handler.stop();
        expect(handler.isActive).toBe(false);
      });
    });
  });
});
