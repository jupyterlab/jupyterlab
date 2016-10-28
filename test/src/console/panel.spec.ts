// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session, utils
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CodeMirrorConsoleRenderer
} from '../../../lib/console/codemirror/widget';

import {
  ConsoleContent
} from '../../../lib/console/content';

import {
  ConsolePanel
} from '../../../lib/console/panel';

import {
  defaultRenderMime
} from '../utils';


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


const renderer = CodeMirrorConsoleRenderer.defaultRenderer;
const rendermime = defaultRenderMime();


describe('console/panel', () => {

  let panel: TestPanel;
  let session: Session.ISession;

  beforeEach(done => {
    Session.startNew({ path: utils.uuid() }).then(newSession => {
      session = newSession;
      panel = new TestPanel({ renderer, rendermime, session });
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

    describe('#content', () => {

      it('should be a console content widget created at instantiation', () => {
        expect(panel.content).to.be.a(ConsoleContent);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        expect(panel.content).to.be.ok();
        panel.dispose();
        expect(panel.content).to.not.be.ok();
      });

    });

    describe('#onActivateRequest()', () => {

      it('should give the focus to the console prompt', done => {
        expect(panel.methods).to.not.contain('onActivateRequest');
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          expect(panel.content.prompt.editor.hasFocus()).to.be(false);
          panel.activate();
          requestAnimationFrame(() => {
            expect(panel.methods).to.contain('onActivateRequest');
            expect(panel.content.prompt.editor.hasFocus()).to.be(true);
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

  });

});
