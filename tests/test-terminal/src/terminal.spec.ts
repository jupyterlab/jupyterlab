// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Terminal as TerminalNS, TerminalManager } from '@jupyterlab/services';

import { Message, MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { Terminal } from '@jupyterlab/terminal';

import { framePromise, testEmission } from '@jupyterlab/testutils';

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
    let session: TerminalNS.ITerminalConnection;
    let manager = new TerminalManager();

    before(async () => {
      session = await manager.startNew();
    });

    beforeEach(() => {
      widget = new LogTerminal(session);
      Widget.attach(widget, document.body);
      return framePromise();
    });

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {
      it('should create a terminal widget', () => {
        expect(widget).to.be.an.instanceof(Terminal);
      });
    });

    describe('#session', () => {
      it('should be the constructor value', () => {
        expect(widget.session).to.equal(session);
      });

      it('should set the title when ready', async () => {
        if (session.connectionStatus !== 'connected') {
          await testEmission(session.connectionStatusChanged, {
            find: (_, status) => status === 'connected'
          });
        }
        expect(widget.title.label).to.contain(session.name);
      });
    });

    describe('#fontSize', () => {
      it('should be 13 by default', () => {
        expect(widget.getOption('fontSize')).to.equal(13);
      });

      it('should trigger an update request', async () => {
        widget.setOption('fontSize', 14);
        expect(widget.getOption('fontSize')).to.equal(14);
        await framePromise();
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#scrollback', () => {
      it('should be 1000 by default', () => {
        expect(widget.getOption('scrollback')).to.equal(1000);
      });
    });

    describe('#theme', () => {
      it('should be set to inherit by default', () => {
        expect(widget.getOption('theme')).to.equal('inherit');
      });

      it('should be light if we change it', () => {
        widget.setOption('theme', 'light');
        expect(widget.getOption('theme')).to.equal('light');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#refresh()', () => {
      it('should refresh the widget', () => {
        return widget.refresh();
      });
    });

    describe('#processMessage()', () => {
      it('should handle fit requests', () => {
        widget.processMessage(Widget.Msg.FitRequest);
        expect(widget.methods).to.contain('onFitRequest');
      });
    });

    describe('#onAfterAttach()', () => {
      it('should post an update request', async () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        await framePromise();
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#onAfterShow()', () => {
      it('should post an update request', async () => {
        widget.hide();
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        await framePromise();
        widget.methods = [];
        widget.show();
        await framePromise();
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#onResize()', () => {
      it('should trigger an update request', async () => {
        const msg = Widget.ResizeMessage.UnknownSize;
        MessageLoop.sendMessage(widget, msg);
        expect(widget.methods).to.contain('onResize');
        await framePromise();
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should set the style of the terminal', () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        const style = window.getComputedStyle(widget.node);
        expect(style.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
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
        expect(widget.node.contains(document.activeElement)).to.equal(false);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        expect(widget.node.contains(document.activeElement)).to.equal(true);
      });
    });
  });
});
