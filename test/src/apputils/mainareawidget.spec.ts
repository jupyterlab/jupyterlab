// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  MainAreaWidget
} from '@jupyterlab/apputils';

import {
  MessageLoop
} from '@phosphor/messaging';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';


describe('@jupyterlab/apputils', () => {

  describe('MainAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create a new main area widget', () => {
        const widget = new MainAreaWidget();
        expect(widget).to.be.an.instanceof(MainAreaWidget);
        expect(widget.hasClass('jp-MainAreaWidget')).to.equal(true);
        expect(widget.node.tabIndex).to.equal(-1);
        expect(widget.layout).to.be.an.instanceof(PanelLayout);
      });

      it('should allow node and layout options', () => {
        const layout = new PanelLayout();
        const node = document.createElement('div');
        const widget = new MainAreaWidget({node, layout});
        expect(widget.hasClass('jp-MainAreaWidget')).to.equal(true);
        expect(widget.node).to.equal(node);
        expect(widget.node.tabIndex).to.equal(-1);
        expect(widget.layout).to.equal(layout);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus on activation', () => {
        const widget = new MainAreaWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(document.activeElement).to.equal(widget.node);
      });

    });

    describe('#onCloseRequest()', () => {

      it('should dispose on close', () => {
        const widget = new MainAreaWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.CloseRequest);
        expect(widget.isDisposed).to.equal(true);
      });

    });

  });

});
