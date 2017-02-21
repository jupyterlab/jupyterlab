// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, sendMessage
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgetpanel';

import {
  Widget, WidgetMessage
} from '@phosphor/widgetwidget';

import {
  MarkdownWidget, MarkdownWidgetFactory
} from '../../../lib/markdownwidget/widget';

import {
  DocumentRegistry, Context
} from '../../../lib/docregistry';

import {
  createFileContext, defaultRenderMime
} from '../utils';

const RENDERMIME = defaultRenderMime();


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


describe('markdownwidget/widget', () => {

  let context: Context<DocumentRegistry.IModel>;

  beforeEach(() => {
    context = createFileContext();
  });

  afterEach(() => {
    context.dispose();
  });

  describe('MarkdownWidgetFactory', () => {

    describe('#createNew()', () => {

      it('should require a context parameter', () => {
        let widgetFactory = new MarkdownWidgetFactory({
          name: 'markdown',
          fileExtensions: ['.md'],
          rendermime: RENDERMIME
        });
        expect(widgetFactory.createNew(context)).to.be.a(MarkdownWidget);
      });

    });

  });

  describe('MarkdownWidget', () => {

    describe('#constructor()', () => {

      it('should require a context parameter', () => {
        let widget = new MarkdownWidget(context, RENDERMIME);
        expect(widget).to.be.a(MarkdownWidget);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should update the widget', () => {
        let widget = new LogWidget(context, RENDERMIME);
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update rendered markdown', () => {
        let widget = new LogWidget(context, RENDERMIME);
        expect(widget.methods).to.not.contain('onUpdateRequest');
        context.model.contentChanged.emit(void 0);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.dispose();
      });

      it('should replace children on subsequent updates', () => {
        let widget = new LogWidget(context, RENDERMIME);
        context.model.contentChanged.emit(void 0);
        sendMessage(widget, WidgetMessage.UpdateRequest);

        let layout = widget.layout as PanelLayout;
        let oldChild = layout.widgets.at(0);

        sendMessage(widget, WidgetMessage.UpdateRequest);

        let newChild = layout.widgets.at(0);

        expect(oldChild).to.not.be(newChild);
        expect(layout.widgets.length).to.be(1);
        widget.dispose();
      });

    });

  });

});
