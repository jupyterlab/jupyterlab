// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  validateContentsModel, validateCheckpointModel
} from '../../../lib/contents/validate';

import {
  DEFAULT_FILE
} from '../utils';


describe('validate', () => {

  describe('validateContentsModel()', () => {

    it('should pass with valid data', () => {
      validateContentsModel(DEFAULT_FILE);
    });

    it('should fail on missing data', () => {
      let model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete model['path'];
      expect(() => validateContentsModel(model)).to.throwError();
    });

    it('should fail on incorrect data', () => {
      let model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      model.type = 1;
      expect(() => validateContentsModel(model)).to.throwError();
    });

  });

  describe('validateCheckpointModel()', () => {

    it('should pass with valid data', () => {
      validateCheckpointModel({ id: 'foo', last_modified: 'yesterday '});
    });

    it('should fail on missing data', () => {
      let model = { id: 'foo' };
      expect(() => validateCheckpointModel(model as any)).to.throwError();
    });

    it('should fail on incorrect data', () => {
      let model = { id: 1, last_modified: '1'};
      expect(() => validateCheckpointModel(model as any)).to.throwError();
    });

  });

});
