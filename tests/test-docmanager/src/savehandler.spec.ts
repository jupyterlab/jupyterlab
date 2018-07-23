// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import { ServiceManager } from '@jupyterlab/services';

import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';

import { SaveHandler } from '@jupyterlab/docmanager';

import { PromiseDelegate, UUID } from '@phosphor/coreutils';

import { acceptDialog, waitForDialog } from '../../utils';

describe('docregistry/savehandler', () => {
  let manager: ServiceManager.IManager;
  let factory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let handler: SaveHandler;

  before(() => {
    manager = new ServiceManager();
    return manager.ready;
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
        expect(handler).to.be.a(SaveHandler);
      });
    });

    describe('#saveInterval()', () => {
      it('should be the save interval of the handler', () => {
        expect(handler.saveInterval).to.be(120);
      });

      it('should be set-able', () => {
        handler.saveInterval = 200;
        expect(handler.saveInterval).to.be(200);
      });
    });

    describe('#isActive', () => {
      it('should test whether the handler is active', () => {
        expect(handler.isActive).to.be(false);
        handler.start();
        expect(handler.isActive).to.be(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the handler is disposed', () => {
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

      it('should be true after the context is disposed', () => {
        context.dispose();
        expect(handler.isDisposed).to.be(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the handler', () => {
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });
    });

    describe('#start()', () => {
      it('should start the save handler', () => {
        handler.start();
        expect(handler.isActive).to.be(true);
      });

      it('should trigger a save', done => {
        context.fileChanged.connect(() => {
          done();
        });
        context.model.fromString('bar');
        expect(handler.isActive).to.be(false);
        handler.saveInterval = 1;
        handler.start();
      });

      it('should continue to save', done => {
        let called = 0;
        // Lower the duration multiplier.
        (handler as any)._multiplier = 1;
        context.fileChanged.connect(() => {
          if (called === 0) {
            context.model.fromString('bar');
            called++;
          } else {
            done();
          }
        });
        context.model.fromString('foo');
        expect(handler.isActive).to.be(false);
        handler.saveInterval = 1;
        handler.start();
      });

      it('should overwrite the file on disk', async () => {
        const delegate = new PromiseDelegate();

        // Lower the duration multiplier.
        (handler as any)._multiplier = 1;
        context.model.fromString('foo');
        await context.initialize(true);

        // The server has a one second resolution for saves.
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
            expect(context.model.toString()).to.be('baz');
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
            if (buttons[i].textContent === 'REVERT') {
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
          expect(context.model.toString()).to.be('bar');
          delegate.resolve(undefined);
        });

        // The server has a one second resolution for saves.
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
        expect(handler.isActive).to.be(true);
        handler.stop();
        expect(handler.isActive).to.be(false);
      });
    });
  });
});
