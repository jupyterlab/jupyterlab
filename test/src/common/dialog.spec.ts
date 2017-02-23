// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  showDialog, okButton
} from '../../../lib/common/dialog';

import {
  acceptDialog, dismissDialog
} from '../utils';


describe('dialog/index', () => {

  describe('showDialog()', () => {

    it('should accept zero arguments', (done) => {
      showDialog().then(result => {
        expect(result.text).to.be('CANCEL');
        done();
      });
      Promise.resolve().then(() => {
        let node = document.body.getElementsByClassName('jp-Dialog')[0];
        simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
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
      };
      showDialog(options).then(result => {
        expect(result.text).to.be('CANCEL');
        done();
      });
      Promise.resolve().then(() => {
        let target = document.body.getElementsByClassName('jp-Dialog')[0];
        simulate(target as HTMLElement, 'keydown', { keyCode: 27 });
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
        expect(result.text).to.be('CANCEL');
        done();
      });
      dismissDialog();
    });

    it('should accept a select body', (done) => {
      let body = document.createElement('select');
      showDialog({ body }).then(result => {
        expect(result.text).to.be('OK');
        done();
      });
      acceptDialog();
    });

    it('should accept a widget body', (done) => {
      let body = new Widget({node: document.createElement('div')});
      showDialog({ body }).then(result => {
        expect(result.text).to.be('OK');
        done();
      });
      acceptDialog();
    });

    it('should apply an additional CSS class', (done) => {
      showDialog({ dialogClass: 'test-class' }).then(result => {
        expect(result.text).to.be('OK');
        done();
      });
      Promise.resolve().then(() => {
        let nodes = document.body.getElementsByClassName('test-class');
        expect(nodes.length).to.be(1);
        let node = nodes[0];
        expect(node.classList).to.eql(['jp-Dialog', 'test-class']);
      });
      acceptDialog();
    });

    it('should resolve with the clicked button result', (done) => {
      let button = {
        text: 'foo',
        className: 'bar',
        icon: 'baz'
      };
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
        expect(result.text).to.be('CANCEL');
        done();
      });
      Promise.resolve().then(() => {
        let node = document.body.getElementsByClassName('jp-Dialog')[0];
        simulate(node as HTMLElement, 'contextmenu');
        simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
      });
    });

    /**
     * Class to test that onAfterAttach is called
     */
    class TestWidget extends Widget {
      constructor(resolve: () => void) {
        super();
        this.resolve = resolve;
      }
      protected onAfterAttach(msg: Message): void {
        this.resolve();
      }

      resolve: () => void;
    }

    it('should fire onAfterAttach on widget body', (done) => {
      let promise = new Promise((resolve, reject) => {
        let body = new TestWidget(resolve);
        showDialog({ body });
      });
      promise.then(() => {
        dismissDialog();
        done();
      });
    });

  });

});
