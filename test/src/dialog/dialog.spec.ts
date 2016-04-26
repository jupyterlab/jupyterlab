// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  showDialog, okButton
} from '../../../lib/dialog';

import {
  triggerMouseEvent, triggerKeyEvent, acceptDialog
} from '../utils';


describe('jupyter-ui', () => {

  describe('showDialog()', () => {

    it('should accept zero arguments', (done) => {
      showDialog().then(result => {
        expect(result).to.be(null);
        done();
      });
      Promise.resolve().then(() => {
        let node = document.body.getElementsByClassName('jp-Dialog')[0];
        triggerKeyEvent(node as HTMLElement, 'keydown', { keyCode: 27 });
      });
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
      showDialog(options).then(result => {
        expect(result).to.be(null);
        done();
      });
      Promise.resolve().then(() => {
        let target = document.body.getElementsByClassName('jp-Dialog')[0];
        triggerKeyEvent(target as HTMLElement, 'keydown', { keyCode: 27 });
      });
    });

    it('should accept an html body', (done) => {
      let body = document.createElement('div');
      let input = document.createElement('input');
      let select = document.createElement('select');
      body.appendChild(input);
      body.appendChild(select);
      showDialog({ body, okText: 'CONFIRM' }).then(result => {
        expect(result.text).to.be('CONFIRM');
        done();
      });
      acceptDialog();
    });

    it('should accept an input body', (done) => {
      let body = document.createElement('input');
      showDialog({ body }).then(result => {
        expect(result.text).to.be('OK');
        done();
      });
      acceptDialog();
    });

    it('should accept a select body', (done) => {
      let body = document.createElement('select');
      showDialog({ body }).then(result => {
        expect(result.text).to.be('OK');
        done();
      });
      acceptDialog();
    });

    it('should resolve with the clicked button result', (done) => {
      let button = {
        text: 'foo',
        className: 'bar',
        icon: 'baz'
      }
      showDialog({ buttons: [button] }).then(result => {
        expect(result.text).to.be('foo');
        done();
      });
      Promise.resolve().then(() => {
        let node = document.body.getElementsByClassName('bar')[0];
        (node as HTMLElement).click();
      });
    });

    it('should ignore context menu events', (done) => {
      let body = document.createElement('div');
      showDialog({ body }).then(result => {
        expect(result).to.be(null);
        done();
      });
      Promise.resolve().then(() => {
        let node = document.body.getElementsByClassName('jp-Dialog')[0];
        triggerMouseEvent(node as HTMLElement, 'contextmenu');
        triggerKeyEvent(node as HTMLElement, 'keydown', { keyCode: 27 });
      });
    });

  });

});
