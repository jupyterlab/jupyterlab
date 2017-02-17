// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  deepEqual
} from 'phosphor/lib/algorithm/json';

import {
  MimeModel
} from '../../../lib/rendermime';


describe('rendermime/mimemodel', () => {

  let model: MimeModel;

  beforeEach(() => {
    model = new MimeModel();
  });

  afterEach(() => {
    model.dispose();
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

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let count = 0;
        let model = new MimeModel();
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args).to.be(void 0);
          count++;
        });
        model.data.set('foo', 1);
        model.data.delete('foo');
        model.metadata.set('foo', 2);
        expect(count).to.be(3);
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

    describe('#dispose()', () => {

      it('should dispose of the resources used by the model', () => {
        let model = new MimeModel();
        model.dispose();
        expect(model.isDisposed).to.be(true);
        model.dispose();
        expect(model.isDisposed).to.be(true);
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

    describe('#toJSON()', () => {

      it('should return the raw JSON values', () => {
        let model = new MimeModel();
        model.data.set('foo', 1);
        model.metadata.set('bar', 'baz');
        expect(deepEqual(model.toJSON(), {
          trusted: false,
          data: {'foo': 1 },
          metadata: {'bar': 'baz'}
        })).to.be(true);
      });

    });

  });

});
