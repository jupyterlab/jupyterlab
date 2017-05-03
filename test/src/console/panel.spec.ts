// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeConsole, ConsolePanel
} from '@jupyterlab/console';

import {
  dismissDialog
} from '../utils';

import {
  createConsolePanelFactory, rendermime, mimeTypeService, editorFactory
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
  let manager = new ServiceManager();

  before(() => {
    return manager.ready;
  });

  beforeEach(() => {
    panel = new TestPanel({
      manager, contentFactory, rendermime, mimeTypeService
    });
  });

  afterEach(() => {
    panel.dispose();
  });

  describe('ConsolePanel', () => {

    describe('#constructor()', () => {

      it('should create a new console panel', () => {
        expect(panel).to.be.a(ConsolePanel);
        expect(panel.node.classList).to.contain('jp-ConsolePanel');
      });

    });

    describe('#console', () => {

      it('should be a code console widget created at instantiation', () => {
        expect(panel.console).to.be.a(CodeConsole);
      });

    });

    describe('#session', () => {

      it('should be a client session object', () => {
        expect(panel.session.path).to.be.ok();
      });

    });


    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should start the session', () => {
        Widget.attach(panel, document.body);
        dismissDialog();
        return panel.session.ready;
      });

    });

    describe('#onActivateRequest()', () => {

      it('should give the focus to the console prompt', () => {
        expect(panel.methods).to.not.contain('onActivateRequest');
        Widget.attach(panel, document.body);
        MessageLoop.sendMessage(panel, Widget.Msg.ActivateRequest);
        expect(panel.methods).to.contain('onActivateRequest');
        expect(panel.console.promptCell.editor.hasFocus()).to.be(true);
        return dismissDialog();
      });

    });

    describe('#onCloseRequest()', () => {

      it('should dispose of the panel resources after closing', () => {
        expect(panel.methods).to.not.contain('onCloseRequest');
        Widget.attach(panel, document.body);
        expect(panel.isDisposed).to.be(false);
        MessageLoop.sendMessage(panel, Widget.Msg.CloseRequest);
        expect(panel.methods).to.contain('onCloseRequest');
        expect(panel.isDisposed).to.be(true);
        return dismissDialog();
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new code console factory', () => {
          let factory = new ConsolePanel.ContentFactory({ editorFactory });
          expect(factory).to.be.a(ConsolePanel.ContentFactory);
        });

      });

      describe('#createConsole()', () => {

        it('should create a console widget', () => {
          let options = {
            contentFactory: contentFactory,
            rendermime,
            mimeTypeService,
            session: panel.session
          };
          expect(contentFactory.createConsole(options)).to.be.a(CodeConsole);
        });

      });

    });


  });

});
