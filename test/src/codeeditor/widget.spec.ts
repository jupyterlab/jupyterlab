// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  ResizeMessage, Widget, WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  CodeEditorWidget
} from '../../../lib/codeeditor';

import {
  CodeMirrorEditor
} from '../../../lib/codemirror';


class LogWidget extends CodeEditorWidget {

  methods: string[] = [];

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.methods.push('onAfterShow');
  }

  protected onResize(msg: ResizeMessage): void {
    super.onResize(msg);
    this.methods.push('onResize');
  }
}


describe('CodeEditorWidget', () => {

  let widget: LogWidget;
  let editorFactory = (host: Widget) => {
    return new CodeMirrorEditor(host.node, { uuid: 'foo' });
  };

  beforeEach(() => {
    widget = new LogWidget(editorFactory);
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {

    it('should be a CodeEditorWidget', () => {
      expect(widget).to.be.a(CodeEditorWidget);
    });

  });

  describe('#editor', () => {

    it('should be a a code editor', () => {
      expect(widget.editor.lineNumbers).to.be(false);
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

  describe('#onActivateRequest()', () => {

    it('should focus the editor', () => {
      Widget.attach(widget, document.body);
      sendMessage(widget, WidgetMessage.ActivateRequest);
      expect(widget.editor.hasFocus()).to.be(true);
    });

  });

  describe('#onAfterAttach()', () => {

  });

  describe('#onBeforeDetach()', () => {

  });

  describe('#onAfterShow()', () => {

  });

  describe('#onResize()', () => {

  });

  describe('#handleEvent()', () => {

    context('focus', () => {

    });

  });

});
