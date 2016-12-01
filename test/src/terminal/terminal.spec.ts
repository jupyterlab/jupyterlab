// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ResizeMessage
} from 'phosphor/lib/ui/widget';

import {
  TerminalWidget
} from '../../../lib/terminal';


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

  protected onResize(msg: ResizeMessage): void {
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

      it('should get be `null` by default', () => {

      });

      it('should be settable', () => {

      });

    });

    describe('#fontSize', () => {

      it('should be 14 by default', () => {

      });

      it('should be settable', () => {

      });

    });

    describe('#background', () => {

      it('should be black by default', () => {

      });

      it('should be settable', () => {

      });

    });

    describe('#color', () => {

      it('should be white by default', () => {

      });

      it('should be settable', () => {

      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {

      });

    });

    describe('#processMessage()', () => {

      it('should handle fit requests', () => {

      });

    });

    describe('#onAfterAttach()', () => {

      it('should snap the terminal sizing', () => {

      });

    });

    describe('#onAfterShow()', () => {

      it('should snap the terminal sizing', () => {

      });

    });

    describe('#onCloseRequest', () => {

      it('should dispose of the terminal after closing', () => {

      });

    });

    describe('#onResize()', () => {

      it('should resize the terminal', () => {

      });

    });

    describe('#onUpdateRequest()', () => {

      it('should set the style of the terminal', () => {

      });

    });

    describe('#onFitRequest', () => {

      it('should send a resize request', () => {

      });

    });

    describe('#onActivateRequest', () => {

      it('should focus the terminal element', () => {

      });

    });

  });

});
