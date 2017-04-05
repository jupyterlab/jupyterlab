// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  VirtualDOM, h
} from '@phosphor/virtualdom';

import {
  simulate
} from 'simulate-event';

import {
  Styling
} from '@jupyterlab/apputils';


describe('@jupyterlab/domutils', () => {

  describe('Styling', () => {

    describe('.styleNode()', () => {

      it('should style descendant nodes for select, input and button', () => {
        let vnode = h.div({}, [h.button(), h.select(), h.input()]);
        let node = VirtualDOM.realize(vnode);
        Styling.styleNode(node);
        expect(node.querySelectorAll('.jp-mod-styled').length).to.equal(3);
      });

      it('should wrap a select node', () => {
        let parent = document.createElement('div');
        let select = document.createElement('select');
        parent.appendChild(select);
        Styling.styleNode(parent);
        let wrapper = parent.firstChild as HTMLElement;
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
        let vnode = h.div({}, [h.span(), h.div({}, h.span())]);
        let node = VirtualDOM.realize(vnode);
        Styling.styleNodeByTag(node, 'span');
        expect(node.querySelectorAll('.jp-mod-styled').length).to.equal(2);
      });

      it('should style the node itself', () => {
        let div = document.createElement('div');
        Styling.styleNodeByTag(div, 'div');
        expect(div.className).to.contain('jp-mod-styled');
      });

    });

    describe('.wrapSelect()', () => {

      it('should wrap the select node', () => {
        let select = document.createElement('select');
        let wrapper = Styling.wrapSelect(select);
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
