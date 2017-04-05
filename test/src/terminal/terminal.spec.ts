// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  Platform
} from '@phosphor/domutils';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  TerminalWidget
} from '@jupyterlab/terminal';


class LogTerminal extends TerminalWidget {

  methods: string[] = [];

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.methods.push('onAfterShow');
  }

  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.methods.push('onCloseRequest');
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

  describe('TerminalWidget', () => {

    let widget: LogTerminal;
    let session: TerminalSession.ISession;

    before((done) => {
      if (Platform.IS_WIN) {
        session = null;
        expect(() => { TerminalSession.startNew(); }).to.throwError();
        return done();
      }
      TerminalSession.startNew().then(s => {
        session = s;
      }).then(done, done);
    });

    beforeEach(() => {
      widget = new LogTerminal();
    });

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {

      it('should create a terminal widget', () => {
        expect(widget).to.be.a(TerminalWidget);
      });

    });

    describe('#session', () => {

      it('should be `null` by default', () => {
        expect(widget.session).to.be(null);
      });

      it('should set the title when ready', function(done) {
        if (Platform.IS_WIN) {
          return this.skip();
        }
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

    describe('#background', () => {

      it('should be black by default', () => {
        expect(widget.background).to.be('black');
      });

      it('should trigger an update request', (done) => {
        widget.background = 'white';
        expect(widget.background).to.be('white');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#color', () => {

      it('should be white by default', () => {
        expect(widget.color).to.be('white');
      });

      it('should trigger an update request', (done) => {
        widget.color = 'black';
        expect(widget.color).to.be('black');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
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
        if (Platform.IS_WIN) {
          expect(widget.refresh()).to.be.a(Promise);
          return done();
        }
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

    describe('#onCloseRequest', () => {

      it('should dispose of the terminal after closing', () => {
        widget.close();
        expect(widget.methods).to.contain('onCloseRequest');
        expect(widget.isDisposed).to.be(true);
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
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        let style = window.getComputedStyle(widget.node);
        expect(style.backgroundColor).to.be('rgb(0, 0, 0)');
        expect(style.color).to.be('rgb(255, 255, 255)');
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
        Widget.attach(widget, document.body);
        expect(widget.node.contains(document.activeElement)).to.be(false);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        expect(widget.node.contains(document.activeElement)).to.be(true);
      });

    });

  });

});
