// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ISignal, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  Inspector
} from '../../../lib/inspector';


class TestInspectable implements Inspector.IInspectable {
  disposed: ISignal<any, void>;

  ephemeralCleared: ISignal<any, void>;

  inspected: ISignal<any, Inspector.IInspectorUpdate>;
}

defineSignal(TestInspectable.prototype, 'disposed');
defineSignal(TestInspectable.prototype, 'ephemeralCleared');
defineSignal(TestInspectable.prototype, 'inspected');


describe('inspector/index', () => {

  describe('Inspector', () => {

    describe('#constructor()', () => {

      it('should construct a new inspector widget', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
      });

      it('should add the `jp-Inspector` class', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.hasClass('jp-Inspector')).to.be(true);
      });

      it('should accept an options argument with inspector items', () => {
        let options: Inspector.IOptions = {
          items: [{ name: 'Foo', rank: 20, type: 'foo' }]
        };
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
      });

    });

    describe('#source', () => {

      it('should default to `null`', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.source).to.be(null);
      });

      it('should be settable multiple times', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        let source = new TestInspectable();
        expect(widget.source).to.be(null);
        widget.source = source;
        expect(widget.source).to.be(source);
        widget.source = null;
        expect(widget.source).to.be(null);
        widget.source = new TestInspectable();
        expect(widget.source).to.be.a(TestInspectable);
      });

    });

  });

});
