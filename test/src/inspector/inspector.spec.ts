// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Inspector
} from '../../../lib/inspector';


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

  });

});
