// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session
} from '../../../lib/session';

import {
  validateModel
} from '../../../lib/session/validate';


describe('session/validate', () => {

  describe('#validateModel()', () => {

    it('should pass a valid id', () => {
      let id: Session.IModel = {
        id: 'foo',
        kernel: { name: 'foo', id: '123'},
        notebook: { path: 'bar' }
      };
      validateModel(id);
    });

    it('should fail on missing data', () => {
      let id: Session.IModel = {
        id: 'foo',
        kernel: { name: 'foo', id: '123'},
      };
      expect(() => validateModel(id)).to.throwError();
    });

  });

});
