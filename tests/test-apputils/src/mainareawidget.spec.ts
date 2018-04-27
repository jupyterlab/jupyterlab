// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  MainAreaWidget, Toolbar
} from '@jupyterlab/apputils';

import {
  MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';


describe('@jupyterlab/apputils', () => {

  describe('MainAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create a new main area widget', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        expect(widget).to.be.an.instanceof(MainAreaWidget);
        expect(widget.hasClass('jp-MainAreaWidget')).to.equal(true);
        expect(widget.content.node.tabIndex).to.equal(-1);
        expect(widget.title.closable).to.equal(true);
      });

      it('should allow toolbar options', () => {
        const content = new Widget();
        const toolbar = new Toolbar();
        const widget = new MainAreaWidget({ content, toolbar });
        expect(widget.hasClass('jp-MainAreaWidget')).to.equal(true);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus on activation', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(document.activeElement).to.equal(widget.content.node);
      });

    });

    describe('#onCloseRequest()', () => {

      it('should dispose on close', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.CloseRequest);
        expect(widget.isDisposed).to.equal(true);
      });

    });

    context('title', () => {

      it('should proxy from content to main', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        content.title.label = 'foo';
        expect(widget.title.label).to.equal('foo');
      });

      it('should proxy from main to content', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        widget.title.label = 'foo';
        expect(content.title.label).to.equal('foo');
      });

    });

    context('dispose', () => {

      it('should dispose of main', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        content.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

    });

  });

});
