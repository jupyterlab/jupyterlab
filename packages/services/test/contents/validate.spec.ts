// Copyright (c) Jupyter Development Team.

import 'jest';

import {
  validateContentsModel,
  validateCheckpointModel
} from '../../src/contents/validate';

import { DEFAULT_FILE } from '../utils';

describe('validate', () => {
  describe('validateContentsModel()', () => {
    it('should pass with valid data', () => {
      validateContentsModel(DEFAULT_FILE);
    });

    it('should fail on missing data', () => {
      const model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete model['path'];
      expect(() => validateContentsModel(model)).toThrowError();
    });

    it('should fail on incorrect data', () => {
      const model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      model.type = 1;
      expect(() => validateContentsModel(model)).toThrowError();
    });
  });

  describe('validateCheckpointModel()', () => {
    it('should pass with valid data', () => {
      validateCheckpointModel({ id: 'foo', last_modified: 'yesterday ' });
    });

    it('should fail on missing data', () => {
      const model = { id: 'foo' };
      expect(() => validateCheckpointModel(model as any)).toThrowError();
    });

    it('should fail on incorrect data', () => {
      const model = { id: 1, last_modified: '1' };
      expect(() => validateCheckpointModel(model as any)).toThrowError();
    });
  });
});
