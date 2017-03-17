// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session, utils
} from '@jupyterlab/services';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeConsole, ConsolePanel
} from '@jupyterlab/console';

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
  let session: Session.ISession;

  beforeEach(done => {
    Session.startNew({ path: utils.uuid() }).then(newSession => {
      session = newSession;
      panel = new TestPanel({ contentFactory, rendermime, session,
                              mimeTypeService });
      done();
    });
  });

  afterEach(done => {
    session.shutdown().then(() => {
      session.dispose();
      panel.dispose();
      done();
    }).catch(done);
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

    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should give the focus to the console prompt', done => {
        expect(panel.methods).to.not.contain('onActivateRequest');
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          panel.activate();
          requestAnimationFrame(() => {
            expect(panel.methods).to.contain('onActivateRequest');
            expect(panel.console.prompt.editor.hasFocus()).to.be(true);
            done();
          });
        });
      });

    });

    describe('#onCloseRequest()', () => {

      it('should dispose of the panel resources after closing', done => {
        expect(panel.methods).to.not.contain('onCloseRequest');
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          expect(panel.isDisposed).to.be(false);
          panel.close();
          requestAnimationFrame(() => {
            expect(panel.methods).to.contain('onCloseRequest');
            expect(panel.isDisposed).to.be(true);
            done();
          });
        });
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new code console factory', () => {
          let factory = new ConsolePanel.ContentFactory({ editorFactory });
          expect(factory).to.be.a(ConsolePanel.ContentFactory);
        });

      });

      describe('#consoleContentFactory', () => {

        it('should be the console content factory used by the panel factory', () => {
          expect(contentFactory.consoleContentFactory).to.be.a(CodeConsole.ContentFactory);
        });

      });

      describe('#createConsole()', () => {

        it('should create a notebook widget', () => {
          let options = {
            contentFactory: contentFactory.consoleContentFactory,
            rendermime,
            mimeTypeService,
            session
          };
          expect(contentFactory.createConsole(options)).to.be.a(CodeConsole);
        });

      });

    });


  });

});
