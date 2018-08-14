// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Session } from '../../../lib/session';

import { validateModel } from '../../../lib/session/validate';

describe('session/validate', () => {
  describe('#validateModel()', () => {
    it('should pass a valid model', () => {
      const model: Session.IModel = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        path: 'bar',
        name: '',
        type: ''
      };
      validateModel(model);
    });

    it('should pass a deprecated model', () => {
      const model = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        notebook: {
          path: 'bar'
        }
      };
      validateModel(model);
    });

    it('should fail on missing data', () => {
      const model: any = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        path: 'bar',
        name: ''
      };
      expect(() => validateModel(model)).to.throw();
    });
  });
});
