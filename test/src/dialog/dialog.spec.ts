// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  showDialog, okButton
} from '../../../lib/dialog';

import {
  triggerMouseEvent, triggerKeyEvent
} from '../utils';


describe('jupyter-ui', () => {

  describe('showDialog()', () => {

    it('should accept zero arguments', (done) => {
      showDialog().then(result => {
        expect(result).to.be(null);
        done();
      });
      triggerKeyEvent(document.body, 'keydown', { keyCode: 27 });
    });

    it('should accept dialog options', (done) => {
      let node = document.createElement('div');
      document.body.appendChild(node);
      let options = {
        title: 'foo',
        body: 'Hello',
        host: node,
        buttons: [okButton],
        okText: 'Yep'
      }
      showDialog().then(result => {
        expect(result).to.be(null);
        expect(node.firstChild).to.be(void 0);
        done();
      });
      triggerKeyEvent(document.body, 'keydown', { keyCode: 27 });
    });

    it('should accept an html body', (done) => {
      let body = document.createElement('div');
      let input = document.createElement('input');
      let select = document.createElement('select');
      body.appendChild(input);
      body.appendChild(select);
      showDialog({ body }).then(result => {
        expect(result).to.be(null);
        done();
      });
      triggerKeyEvent(document.body, 'keydown', { keyCode: 27 });
    });

    it('should resolve with the clicked button result', (done) => {
      let button = {
        text: 'foo',
        className: 'bar'
      }
      showDialog({ buttons: [button] }).then(result => {
        expect(result.text).to.be('foo');
        done();
      });
      let node = document.body.getElementsByClassName('bar')[0];
      triggerMouseEvent(node as HTMLElement, 'click');
    });

    it('should ignore context menu events', (done) => {
      let body = document.createElement('div');
      showDialog({ body }).then(result => {
        expect(result).to.be(null);
        done();
      });
      triggerMouseEvent(body as HTMLElement, 'contextmenu');
      triggerKeyEvent(document.body, 'keydown', { keyCode: 27 });
    });

  });

});
