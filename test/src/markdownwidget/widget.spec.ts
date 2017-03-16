// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  MarkdownWidget, MarkdownWidgetFactory
} from '@jupyterlab/markdownwidget';

import {
  DocumentRegistry, Context
} from '@jupyterlab/docregistry';

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
        (context.model.contentChanged as any).emit(void 0);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.dispose();
      });

      it('should replace children on subsequent updates', () => {
        let widget = new LogWidget(context, RENDERMIME);
        (context.model.contentChanged as any).emit(void 0);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        let layout = widget.layout as PanelLayout;
        let oldChild = layout.widgets[0];

        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        let newChild = layout.widgets[0];

        expect(oldChild).to.not.be(newChild);
        expect(layout.widgets.length).to.be(1);
        widget.dispose();
      });

    });

  });

});
