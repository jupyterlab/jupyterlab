// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  showDialog, okButton
} from '../../../lib/dialog';


function triggerMouseEvent(node: HTMLElement, eventType: string, options: any = {}) {
  let event = document.createEvent('MouseEvent');
  event.initMouseEvent(
    eventType, true, true, window, 0, 0, 0,
    options.clientX || 0, options.clientY || 0,
    options.ctrlKey || false, options.altKey || false,
    options.shiftKey || false, options.metaKey || false,
    options.button || 0, options.relatedTarget || null
  );
  node.dispatchEvent(event);
}


function triggerKeyEvent(node: HTMLElement, eventType: string, options: any = {}) {
  // cannot use KeyboardEvent in Chrome because it sets keyCode = 0
  let event = document.createEvent('Event');
  event.initEvent(eventType, true, true);
  for (let prop in options) {
    (<any>event)[prop] = options[prop];
  }
  node.dispatchEvent(event);
}


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
