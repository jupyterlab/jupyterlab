// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  validateCheckpointModel,
  validateContentsModel
} from '../../src/contents/validate';
import { DEFAULT_FILE } from '../utils';

describe('validate', () => {
  describe('validateContentsModel()', () => {
    it('should pass with valid data', () => {
      expect(() => {
        validateContentsModel(DEFAULT_FILE);
      }).not.toThrow();
    });

    it('should fail on missing data', () => {
      const model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete model['path'];
      expect(() => validateContentsModel(model)).toThrow();
    });

    it('should fail on incorrect data', () => {
      const model = JSON.parse(JSON.stringify(DEFAULT_FILE));
      model.type = 1;
      expect(() => validateContentsModel(model)).toThrow();
    });
  });

  describe('validateCheckpointModel()', () => {
    it('should pass with valid data', () => {
      expect(() => {
        validateCheckpointModel({ id: 'foo', last_modified: 'yesterday ' });
      }).not.toThrow();
    });

    it('should fail on missing data', () => {
      const model = { id: 'foo' };
      expect(() => validateCheckpointModel(model as any)).toThrow();
    });

    it('should fail on incorrect data', () => {
      const model = { id: 1, last_modified: '1' };
      expect(() => validateCheckpointModel(model as any)).toThrow();
    });
  });
});
