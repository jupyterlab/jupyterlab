// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  MarkdownWidget, MarkdownWidgetFactory
} from '../../../lib/markdownwidget/widget';

import {
  DocumentModel
} from '../../../lib/docregistry';

import {
  MockContext
} from '../docmanager/mockcontext';

import {
  defaultRenderMime
} from '../rendermime/rendermime.spec';


class LogWidget extends MarkdownWidget {
  methods: string[] = [];

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

}


const RENDERMIME = defaultRenderMime();


describe('markdownwidget/widget', () => {

  describe('MarkdownWidgetFactory', () => {

    describe('#createNew()', () => {

      it('should require a context parameter', () => {
        let context = new MockContext(new DocumentModel());
        let widgetFactory = new MarkdownWidgetFactory(RENDERMIME);
        expect(widgetFactory.createNew(context)).to.be.a(MarkdownWidget);
      });

    });

  });

  describe('MarkdownWidget', () => {

    describe('#constructor()', () => {

      it('should require a context parameter', () => {
        let context = new MockContext(new DocumentModel());
        let widget = new MarkdownWidget(context, RENDERMIME);
        expect(widget).to.be.a(MarkdownWidget);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should update the widget', () => {
        let context = new MockContext(new DocumentModel());
        let widget = new LogWidget(context, RENDERMIME);
        expect(widget.methods).to.not.contain('onAfterAttach');
        widget.attach(document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update rendered markdown', () => {
        let context = new MockContext(new DocumentModel());
        let widget = new LogWidget(context, RENDERMIME);
        expect(widget.methods).to.not.contain('onUpdateRequest');
        context.model.contentChanged.emit(void 0);
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.dispose();
      });

      it('should replace children on subsequent updates', () => {
        let context = new MockContext(new DocumentModel());
        let widget = new LogWidget(context, RENDERMIME);
        context.model.contentChanged.emit(void 0);
        sendMessage(widget, Widget.MsgUpdateRequest);

        let layout = widget.layout as PanelLayout;
        let oldChild = layout.childAt(0);

        sendMessage(widget, Widget.MsgUpdateRequest);

        let newChild = layout.childAt(0);

        expect(oldChild).to.not.be(newChild);
        expect(layout.childCount()).to.be(1);
        widget.dispose();
      });

    });

  });

});
