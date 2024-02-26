// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget, Toolbar } from '@jupyterlab/apputils';
import { MessageLoop } from '@lumino/messaging';
import { BoxPanel, Widget } from '@lumino/widgets';

describe('@jupyterlab/apputils', () => {
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

      it('toolbar should have an aria label of notebook actions and a role of toolbar', () => {
        const content = new Widget();
        const toolbar = new Toolbar();
        const widget = new MainAreaWidget({ content, toolbar });
        expect(widget.toolbar.node.getAttribute('aria-label')).toEqual(
          'notebook actions'
        );
        expect(widget.toolbar.node.getAttribute('role')).toEqual('toolbar');
      });

      // This test covers incorrect behaviour documented in issue #13045
      it.failing(
        'content should have an aria-label of notebook content and a role of region',
        () => {
          const content = new Widget();
          const widget = new MainAreaWidget({ content });
          expect(widget.content.node.getAttribute('aria-label')).toEqual('');
          expect(widget.content.node.getAttribute('role')).toEqual('region');
        }
      );
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
