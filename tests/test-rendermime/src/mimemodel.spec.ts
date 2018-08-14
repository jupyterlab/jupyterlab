// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { MimeModel } from '@jupyterlab/rendermime';

describe('rendermime/mimemodel', () => {
  describe('MimeModel', () => {
    describe('#constructor()', () => {
      it('should create a new mime model', () => {
        const model = new MimeModel();
        expect(model).to.be.an.instanceof(MimeModel);
      });

      it('should accept arguments', () => {
        const model = new MimeModel({
          data: { foo: 1 },
          metadata: { bar: 'baz' }
        });
        expect(model).to.be.an.instanceof(MimeModel);
      });
    });

    describe('#data', () => {
      it('should be the data observable map', () => {
        const model = new MimeModel({
          data: { bar: 'baz' }
        });
        expect(model.data['bar']).to.equal('baz');
      });
    });

    describe('#metadata', () => {
      it('should be the metadata observable map', () => {
        const model = new MimeModel({
          metadata: { bar: 'baz' }
        });
        expect(model.metadata['bar']).to.equal('baz');
      });
    });
  });
});
