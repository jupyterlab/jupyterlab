// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeModel
} from '@jupyterlab/rendermime';


describe('rendermime/mimemodel', () => {

  let model: MimeModel;

  beforeEach(() => {
    model = new MimeModel();
  });

  describe('MimeModel', () => {

    describe('#constructor()', () => {

      it('should create a new mime model', () => {
        let model = new MimeModel();
        expect(model).to.be.a(MimeModel);
      });

      it('should accept arguments', () => {
        let model = new MimeModel({
          data: { 'foo': 1},
          trusted: true,
          metadata: { 'bar': 'baz' }
        });
        expect(model).to.be.a(MimeModel);
      });

    });

    describe('#trusted', () => {

      it('should get the trusted state of the model', () => {
        let model = new MimeModel();
        expect(model.trusted).to.be(false);
        model = new MimeModel({ trusted: true });
        expect(model.trusted).to.be(true);
      });

    });

    describe('#data', () => {

      it('should be the data observable map', () => {
        let model = new MimeModel({
          data: { 'bar': 'baz' }
        });
        expect(model.data.get('bar')).to.be('baz');
      });

    });

    describe('#metadata', () => {

      it('should be the metadata observable map', () => {
        let model = new MimeModel({
          metadata: { 'bar': 'baz' }
        });
        expect(model.metadata.get('bar')).to.be('baz');
      });

    });

  });

});
