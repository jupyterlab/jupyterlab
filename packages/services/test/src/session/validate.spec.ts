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

    it('should pass a valid model', () => {
      let model: Session.IModel = {
        id: 'foo',
        kernel: { name: 'foo', id: '123'},
        path: 'bar',
        name: '',
        type: ''
      };
      validateModel(model);
    });

    it('should fail on missing data', () => {
      let model: any = {
        id: 'foo',
        kernel: { name: 'foo', id: '123'},
        path: 'bar',
        name: ''
      };
      expect(() => validateModel(model)).to.throwError();
    });

  });

});
