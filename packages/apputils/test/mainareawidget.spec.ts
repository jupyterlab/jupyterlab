// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget, ShadowDOMWidget, Toolbar } from '@jupyterlab/apputils';
import { MessageLoop } from '@lumino/messaging';
import { BoxPanel, Widget } from '@lumino/widgets';

describe('@jupyterlab/apputils', () => {
  describe('ShadowDOMWidget', () => {
    describe('#constructor()', () => {
      it('should create a shadow root on the widget node', () => {
        let widget = new ShadowDOMWidget();
        expect(widget.node).not.toEqual(widget.attachmentNode);
        expect(widget.attachmentNode.shadowRoot).not.toEqual(null);

        widget = new ShadowDOMWidget();
        expect(widget.node).toEqual(widget.attachmentNode);
        expect(widget.attachmentNode.shadowRoot).toEqual(null);
      });
    });
    describe('#adoptStyleSheet()', () => {
      it('should adopt style sheets for widgets with shadow DOM', () => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('* { color: red; }');

        let widget = new ShadowDOMWidget();
        Widget.attach(widget, document.body);

        let div = document.createElement('div');
        widget.node.appendChild(div);

        expect(window.getComputedStyle(div).color).toEqual('rgb(0, 0, 0)');

        let wasAdopted = widget.adoptStyleSheet(sheet);
        expect(wasAdopted).toEqual(true);
        expect(window.getComputedStyle(div).color).toEqual('rgb(255, 0, 0)');

        wasAdopted = widget.adoptStyleSheet(sheet);
        expect(wasAdopted).toEqual(false);
      });
    });

    describe('#removeAdoptedStyleSheet()', () => {
      it('should adopt style sheets for widgets with shadow DOM', () => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('* { color: red; }');

        let widget = new ShadowDOMWidget();
        Widget.attach(widget, document.body);

        let div = document.createElement('div');
        widget.node.appendChild(div);

        widget.adoptStyleSheet(sheet);
        expect(window.getComputedStyle(div).color).toEqual('rgb(255, 0, 0)');

        let wasRemoved = widget.removeAdoptedStyleSheet(sheet);
        expect(wasRemoved).toEqual(true);
        expect(window.getComputedStyle(div).color).toEqual('rgb(0, 0, 0)');

        wasRemoved = widget.removeAdoptedStyleSheet(sheet);
        expect(wasRemoved).toEqual(false);
      });
    });
  });

  describe('MainAreaWidget', () => {
    describe('#constructor()', () => {
      it('should create a new main area widget', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        expect(widget).toBeInstanceOf(MainAreaWidget);
        expect(widget.hasClass('jp-MainAreaWidget')).toBe(true);
        expect(widget.title.closable).toBe(true);
      });

      it('should allow toolbar options', () => {
        const content = new Widget();
        const toolbar = new Toolbar();
        const widget = new MainAreaWidget({ content, toolbar });
        expect(widget.hasClass('jp-MainAreaWidget')).toBe(true);
        expect(widget.toolbar).toBe(toolbar);
      });

      it('toolbar should have an aria label of main area toolbar and a role of toolbar', () => {
        const content = new Widget();
        const toolbar = new Toolbar();
        const widget = new MainAreaWidget({ content, toolbar });
        expect(widget.toolbar.node.getAttribute('aria-label')).toEqual(
          'main area toolbar'
        );
        expect(widget.toolbar.node.getAttribute('role')).toEqual('toolbar');
      });

      it('content should have an aria-label of main area content and a role of region', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        expect(widget.content.node.getAttribute('aria-label')).toEqual(
          'main area content'
        );
        expect(widget.content.node.getAttribute('role')).toEqual('region');
      });
    });

    describe('contentHeader', () => {
      it('should exist and have correct type', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        expect(widget.contentHeader).toBeInstanceOf(BoxPanel);
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus on activation', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(document.activeElement).toBe(widget.content.node);
      });
    });

    describe('#onCloseRequest()', () => {
      it('should dispose on close', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.CloseRequest);
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should propagate to the content', () => {
        let updated: boolean;
        const content = new (class extends Widget {
          onUpdateRequest() {
            updated = true;
          }
        })();
        const widget = new MainAreaWidget({ content });
        Widget.attach(widget, document.body);
        updated = false;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(updated).toBe(true);
      });
    });

    describe('title', () => {
      it('should proxy from content to main', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        content.title.label = 'foo';
        expect(widget.title.label).toBe('foo');
      });

      it('should proxy from main to content', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        widget.title.label = 'foo';
        expect(content.title.label).toBe('foo');
      });
    });

    describe('dispose', () => {
      it('should dispose of main', () => {
        const content = new Widget();
        const widget = new MainAreaWidget({ content });
        content.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });
  });
});
