// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createSimpleSessionContext } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { CodeConsole, ConsolePanel } from '@jupyterlab/console';
import { dismissDialog } from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
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

  describe('ConsolePanel', () => {
    describe('#constructor()', () => {
      it('should create a new console panel', () => {
        expect(panel).toBeInstanceOf(ConsolePanel);
        expect(Array.from(panel.node.classList)).toEqual(
          expect.arrayContaining(['jp-ConsolePanel'])
        );
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
  });
});
