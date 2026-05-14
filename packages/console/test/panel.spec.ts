// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createSimpleSessionContext } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { CodeConsole, ConsolePanel } from '@jupyterlab/console';
import { Drive } from '@jupyterlab/services';
import { dismissDialog, signalToPromise } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import type { Message } from '@lumino/messaging';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import {
  createConsolePanelFactory,
  editorFactory,
  mimeTypeService,
  rendermime
} from './utils';

class TestPanel extends ConsolePanel {
  methods: string[] = [];

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.methods.push('onCloseRequest');
  }
}

const contentFactory = createConsolePanelFactory();

describe('console/panel', () => {
  describe('ConsolePanel', () => {
    let panel: TestPanel;
    const manager = new ServiceManagerMock();

    beforeAll(async () => {
      return await manager.ready;
    });

    beforeEach(() => {
      panel = new TestPanel({
        manager,
        contentFactory,
        rendermime,
        mimeTypeService,
        sessionContext: createSimpleSessionContext()
      });
    });

    afterEach(() => {
      panel.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new console panel', () => {
        expect(panel).toBeInstanceOf(ConsolePanel);
        expect(Array.from(panel.node.classList)).toEqual(
          expect.arrayContaining(['jp-ConsolePanel'])
        );
      });

      it('should set the session context path to local path', () => {
        manager.contents.addDrive(new Drive({ name: 'TestDrive' }));
        const localPath = `${UUID.uuid4()}.txt`;
        const panel = new TestPanel({
          manager,
          contentFactory,
          rendermime,
          mimeTypeService,
          path: `TestDrive:${localPath}`
        });

        expect(panel.sessionContext.path).toEqual(localPath);
        panel.dispose();
      });
    });

    describe('#console', () => {
      it('should be a code console widget created at instantiation', () => {
        expect(panel.console).toBeInstanceOf(CodeConsole);
      });
    });

    describe('#session', () => {
      it('should be a client session object', () => {
        expect(panel.sessionContext.kernelChanged).toBeTruthy();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the panel', () => {
        panel.dispose();
        expect(panel.isDisposed).toBe(true);
        panel.dispose();
        expect(panel.isDisposed).toBe(true);
      });
    });

    describe('#onAfterAttach()', () => {
      it('should start the session', async () => {
        Widget.attach(panel, document.body);
        await panel.sessionContext.ready;
        await expect(
          panel.sessionContext.session!.kernel!.info
        ).resolves.not.toThrow();
      });
    });

    describe('#onActivateRequest()', () => {
      it('should give the focus to the console prompt', () => {
        Widget.attach(panel, document.body);
        MessageLoop.sendMessage(panel, Widget.Msg.ActivateRequest);
        expect(panel.console.promptCell!.editor!.hasFocus()).toBe(true);
        return dismissDialog();
      });
    });

    describe('#onCloseRequest()', () => {
      it('should dispose of the panel resources after closing', () => {
        Widget.attach(panel, document.body);
        expect(panel.isDisposed).toBe(false);
        MessageLoop.sendMessage(panel, Widget.Msg.CloseRequest);
        expect(panel.isDisposed).toBe(true);
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new code console factory', () => {
          const factory = new ConsolePanel.ContentFactory({ editorFactory });
          expect(factory).toBeInstanceOf(ConsolePanel.ContentFactory);
        });
      });

      describe('#createConsole()', () => {
        it('should create a console widget', () => {
          const options = {
            contentFactory: contentFactory,
            rendermime,
            mimeTypeService,
            sessionContext: panel.sessionContext
          };
          expect(contentFactory.createConsole(options)).toBeInstanceOf(
            CodeConsole
          );
        });
      });
    });

    describe('#updateTitle', () => {
      it('Should update the caption on session change', async () => {
        const newName = 'new session name';
        Widget.attach(panel, document.body);
        await panel.sessionContext.ready;
        const caption = panel.title.caption;
        const promise = signalToPromise(panel.sessionContext.propertyChanged);
        await panel.sessionContext.session?.setName(newName);
        await promise;
        expect(panel.title.caption).not.toEqual(caption);
        expect(panel.title.caption).toContain(newName);
      });

      it('Should update the caption on cell execution', async () => {
        Widget.attach(panel, document.body);
        await panel.sessionContext.ready;
        const caption = panel.title.caption;
        const promise = signalToPromise(panel.console.executed);
        panel.console.promptCell!.model.sharedModel.setSource('a = 2');
        void panel.console.execute(true);
        await promise;
        expect(panel.title.caption).not.toEqual(caption);
      });

      it('Should not update the caption on session change', async () => {
        const newName = 'new session name';
        panel = new TestPanel({
          manager,
          contentFactory,
          rendermime,
          mimeTypeService,
          sessionContext: createSimpleSessionContext(),
          preventTitleUpdate: true
        });
        Widget.attach(panel, document.body);
        await panel.sessionContext.ready;
        const caption = panel.title.caption;
        const promise = signalToPromise(panel.sessionContext.propertyChanged);
        await panel.sessionContext.session?.setName(newName);
        await promise;
        expect(panel.title.caption).toEqual(caption);
        expect(panel.title.caption).not.toContain(newName);
      });

      it('Should not update the caption on cell execution', async () => {
        panel = new TestPanel({
          manager,
          contentFactory,
          rendermime,
          mimeTypeService,
          sessionContext: createSimpleSessionContext(),
          preventTitleUpdate: true
        });
        Widget.attach(panel, document.body);
        await panel.sessionContext.ready;
        const caption = panel.title.caption;
        const promise = signalToPromise(panel.console.executed);
        panel.console.promptCell!.model.sharedModel.setSource('a = 2');
        void panel.console.execute(true);
        await promise;
        expect(panel.title.caption).toEqual(caption);
      });
    });
  });
});
