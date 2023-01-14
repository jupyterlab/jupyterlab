// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';

describe('rendermime/mimemodel', () => {
  describe('MimeModel', () => {
    describe('#constructor()', () => {
      it('should create a new mime model', () => {
        const model = new MimeModel();
        expect(model).toBeInstanceOf(MimeModel);
      });

      it('should accept arguments', () => {
        const model = new MimeModel({
          data: { foo: 1 },
          metadata: { bar: 'baz' }
        });
        expect(model).toBeInstanceOf(MimeModel);
      });
    });

    describe('#data', () => {
      it('should be the data observable map', () => {
        const model = new MimeModel({
          data: { bar: 'baz' }
        });
        expect(model.data['bar']).toBe('baz');
      });
    });

    describe('#metadata', () => {
      it('should be the metadata observable map', () => {
        const model = new MimeModel({
          metadata: { bar: 'baz' }
        });
        expect(model.metadata['bar']).toBe('baz');
      });
    });
  });
});
