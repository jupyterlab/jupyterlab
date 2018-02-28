// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  Terminal
} from '@jupyterlab/terminal';


class LogTerminal extends Terminal {

  methods: string[] = [];

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.methods.push('onAfterShow');
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this.methods.push('onResize');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onFitRequest(msg: Message): void {
    super.onFitRequest(msg);
    this.methods.push('onFitRequest');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

}


describe('terminal/index', () => {

  describe('Terminal', () => {

    let widget: LogTerminal;
    let session: TerminalSession.ISession;

    before((done) => {
      TerminalSession.startNew().then(s => {
        session = s;
      }).then(done, done);
    });

    beforeEach((done) => {
      widget = new LogTerminal();
      Widget.attach(widget, document.body);
      requestAnimationFrame(() => {
        done();
      });
    });

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {

      it('should create a terminal widget', () => {
        expect(widget).to.be.a(Terminal);
      });

    });

    describe('#session', () => {

      it('should be `null` by default', () => {
        expect(widget.session).to.be(null);
      });

      it('should set the title when ready', function(done) {
        widget.session = session;
        expect(widget.session).to.be(session);
        session.ready.then(() => {
          expect(widget.title.label).to.contain(session.name);
        }).then(done, done);
      });

    });

    describe('#fontSize', () => {

      it('should be 13 by default', () => {
        expect(widget.fontSize).to.be(13);
      });

      it('should trigger an update request', (done) => {
        widget.fontSize = 14;
        expect(widget.fontSize).to.be(14);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#theme', () => {

      it('should be dark by default', () => {
        expect(widget.theme).to.be('dark');
      });

      it('should be light if we change it', () => {
        widget.theme = 'light';
        expect(widget.theme).to.be('light');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#refresh()', () => {

      it('should refresh the widget', (done) => {
        widget.session = session;
        widget.refresh().then(done, done);
      });

    });

    describe('#processMessage()', () => {

      it('should handle fit requests', () => {
        widget.processMessage(Widget.Msg.FitRequest);
        expect(widget.methods).to.contain('onFitRequest');
      });

    });

    describe('#onAfterAttach()', () => {

      it('should post an update request', (done) => {
        widget.session = session;
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#onAfterShow()', () => {

      it('should post an update request', (done) => {
        widget.session = session;
        widget.hide();
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          widget.methods = [];
          widget.show();
          requestAnimationFrame(() => {
            expect(widget.methods).to.contain('onUpdateRequest');
            done();
          });
        });
      });

    });

    describe('#onResize()', () => {

      it('should trigger an update request', (done) => {
        let msg = Widget.ResizeMessage.UnknownSize;
        MessageLoop.sendMessage(widget, msg);
        expect(widget.methods).to.contain('onResize');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should set the style of the terminal', () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        let style = window.getComputedStyle(widget.node);
        expect(style.backgroundColor).to.be('rgb(0, 0, 0)');
      });

    });

    describe('#onFitRequest', () => {

      it('should send a resize request', () => {
        MessageLoop.sendMessage(widget, Widget.Msg.FitRequest);
        expect(widget.methods).to.contain('onResize');
      });

    });

    describe('#onActivateRequest', () => {

      it('should focus the terminal element', () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        expect(widget.node.contains(document.activeElement)).to.be(false);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        expect(widget.node.contains(document.activeElement)).to.be(true);
      });

    });

  });

});
