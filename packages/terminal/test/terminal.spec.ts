// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TerminalManager, Terminal as TerminalNS } from '@jupyterlab/services';
import { framePromise, JupyterServer, testEmission } from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { Terminal } from '../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

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
    let manager: TerminalManager;

    beforeAll(async () => {
      manager = new TerminalManager();
      session = await manager.startNew();
    });

    beforeEach(() => {
      widget = new LogTerminal(session, { autoFit: false });
      Widget.attach(widget, document.body);
      return framePromise();
    }, 30000);

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {
      it('should create a terminal widget', () => {
        expect(widget).toBeInstanceOf(Terminal);
      });
    });

    describe('#session', () => {
      it('should be the constructor value', () => {
        expect(widget.session).toBe(session);
      });

      it('should set the title when ready', async () => {
        if (session.connectionStatus !== 'connected') {
          await testEmission(session.connectionStatusChanged, {
            find: (_, status) => status === 'connected'
          });
        }
        expect(widget.title.label).toContain(session.name);
      });
    });

    describe('#fontSize', () => {
      it('should be 13 by default', () => {
        expect(widget.getOption('fontSize')).toBe(13);
      });

      it('should trigger an update request', async () => {
        widget.setOption('fontSize', 14);
        expect(widget.getOption('fontSize')).toBe(14);
        await framePromise();
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });

    describe('#scrollback', () => {
      it('should be 1000 by default', () => {
        expect(widget.getOption('scrollback')).toBe(1000);
      });
    });

    describe('#theme', () => {
      it('should be set to inherit by default', () => {
        expect(widget.getOption('theme')).toBe('inherit');
      });

      it('should be light if we change it', () => {
        widget.setOption('theme', 'light');
        expect(widget.getOption('theme')).toBe('light');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#refresh()', () => {
      it('should refresh the widget', async () => {
        await expect(widget.refresh()).resolves.not.toThrow();
      });
    });

    describe('#processMessage()', () => {
      it('should handle fit requests', () => {
        widget.processMessage(Widget.Msg.FitRequest);
        expect(widget.methods).toContain('onFitRequest');
      });
    });

    describe('#onAfterAttach()', () => {
      it('should post an update request', async () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        await framePromise();
        expect(widget.methods).toContain('onUpdateRequest');
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
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });

    describe('#onResize()', () => {
      it('should trigger an update request', async () => {
        const msg = Widget.ResizeMessage.UnknownSize;
        MessageLoop.sendMessage(widget, msg);
        expect(widget.methods).toContain('onResize');
        await framePromise();
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should attach the terminal', () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).toContain('onUpdateRequest');
        expect(widget.node.firstElementChild!.classList).toContain(
          'jp-Terminal-body'
        );
      });
    });

    describe('#onFitRequest', () => {
      it('should send a resize request', () => {
        MessageLoop.sendMessage(widget, Widget.Msg.FitRequest);
        expect(widget.methods).toContain('onResize');
      });
    });

    describe('#onActivateRequest', () => {
      it('should focus the terminal element', () => {
        Widget.detach(widget);
        Widget.attach(widget, document.body);
        expect(widget.node.contains(document.activeElement)).toBe(false);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).toContain('onActivateRequest');
        expect(widget.node.contains(document.activeElement)).toBe(true);
      });
    });
  });
});
