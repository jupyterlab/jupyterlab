// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { VirtualDOM, h } from '@lumino/virtualdom';

import { simulate } from 'simulate-event';

import { Styling } from '@jupyterlab/apputils';

describe('@jupyterlab/apputils', () => {
  describe('Styling', () => {
    describe('.styleNode()', () => {
      it('should style descendant nodes for select, input and button', () => {
        const vnode = h.div({}, [h.button(), h.select(), h.input()]);
        const node = VirtualDOM.realize(vnode);
        Styling.styleNode(node);
        expect(node.querySelectorAll('.jp-mod-styled').length).to.equal(3);
      });

      it('should wrap a select node', () => {
        const parent = document.createElement('div');
        const select = document.createElement('select');
        parent.appendChild(select);
        Styling.styleNode(parent);
        const wrapper = parent.firstChild as HTMLElement;
        expect(wrapper.className).to.equal('jp-select-wrapper');
        expect(select.parentElement).to.equal(wrapper);
        expect(select.className).to.equal('jp-mod-styled');
        document.body.appendChild(parent);
        select.focus();
        simulate(select, 'focus');
        expect(wrapper.className).to.contain('jp-mod-focused');
        select.blur();
        simulate(select, 'blur');
        expect(wrapper.className).to.not.contain('jp-mod-focused');
        document.body.removeChild(parent);
      });
    });

    describe('.styleNodeByTag()', () => {
      it('should style descendant nodes for the given tag', () => {
        const vnode = h.div({}, [h.span(), h.div({}, h.span())]);
        const node = VirtualDOM.realize(vnode);
        Styling.styleNodeByTag(node, 'span');
        expect(node.querySelectorAll('.jp-mod-styled').length).to.equal(2);
      });

      it('should style the node itself', () => {
        const div = document.createElement('div');
        Styling.styleNodeByTag(div, 'div');
        expect(div.className).to.contain('jp-mod-styled');
      });
    });

    describe('.wrapSelect()', () => {
      it('should wrap the select node', () => {
        const select = document.createElement('select');
        const wrapper = Styling.wrapSelect(select);
        expect(wrapper.className).to.equal('jp-select-wrapper');
        expect(select.parentElement).to.equal(wrapper);
        expect(select.className).to.equal('jp-mod-styled');
        document.body.appendChild(wrapper);
        select.focus();
        simulate(select, 'focus');
        expect(wrapper.className).to.contain('jp-mod-focused');
        select.blur();
        simulate(select, 'blur');
        expect(wrapper.className).to.not.contain('jp-mod-focused');
        document.body.removeChild(wrapper);
      });
    });
  });
});
