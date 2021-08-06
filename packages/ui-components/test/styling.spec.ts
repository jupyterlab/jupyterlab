// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Styling } from '@jupyterlab/ui-components';
import { h, VirtualDOM } from '@lumino/virtualdom';
import { simulate } from 'simulate-event';

describe('@jupyterlab/ui-components', () => {
  describe('Styling', () => {
    describe('.styleNode()', () => {
      it('should style descendant nodes for select, input and button', () => {
        const vnode = h.div({}, [h.button(), h.select(), h.input()]);
        const node = VirtualDOM.realize(vnode);
        Styling.styleNode(node);
        expect(node.querySelectorAll('.jp-mod-styled').length).toBe(3);
      });

      it('should wrap a select node', () => {
        const parent = document.createElement('div');
        const select = document.createElement('select');
        parent.appendChild(select);
        Styling.styleNode(parent);
        const wrapper = parent.firstChild as HTMLElement;
        expect(wrapper.className).toBe('jp-select-wrapper');
        expect(select.parentElement).toBe(wrapper);
        expect(select.className).toBe('jp-mod-styled');
        document.body.appendChild(parent);
        select.focus();
        simulate(select, 'focus');
        expect(wrapper.className).toContain('jp-mod-focused');
        select.blur();
        simulate(select, 'blur');
        expect(wrapper.className).not.toContain('jp-mod-focused');
        document.body.removeChild(parent);
      });
    });

    describe('.styleNodeByTag()', () => {
      it('should style descendant nodes for the given tag', () => {
        const vnode = h.div({}, [h.span(), h.div({}, h.span())]);
        const node = VirtualDOM.realize(vnode);
        Styling.styleNodeByTag(node, 'span');
        expect(node.querySelectorAll('.jp-mod-styled').length).toBe(2);
      });

      it('should style the node itself', () => {
        const div = document.createElement('div');
        Styling.styleNodeByTag(div, 'div');
        expect(div.className).toContain('jp-mod-styled');
      });
    });

    describe('.wrapSelect()', () => {
      it('should wrap the select node', () => {
        const select = document.createElement('select');
        const wrapper = Styling.wrapSelect(select);
        expect(wrapper.className).toBe('jp-select-wrapper');
        expect(select.parentElement).toBe(wrapper);
        expect(select.className).toBe('jp-mod-styled');
        document.body.appendChild(wrapper);
        select.focus();
        simulate(select, 'focus');
        expect(wrapper.className).toContain('jp-mod-focused');
        select.blur();
        simulate(select, 'blur');
        expect(wrapper.className).not.toContain('jp-mod-focused');
        document.body.removeChild(wrapper);
      });
    });
  });
});
