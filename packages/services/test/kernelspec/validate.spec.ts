// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONObject } from '@lumino/coreutils';
import {
  validateSpecModel,
  validateSpecModels
} from '../../src/kernelspec/validate';
import { PYTHON_SPEC } from '../utils';

describe('kernelspec/validate', () => {
  describe('#validateSpecModel', () => {
    it('should pass with valid data', () => {
      expect(() => {
        validateSpecModel(PYTHON_SPEC);
      }).not.toThrow();
    });

    it('should fail on missing data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete spec['name'];
      expect(() => validateSpecModel(spec)).toThrow();
    });

    it('should fail on incorrect data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      spec.spec.language = 1;
      expect(() => validateSpecModel(spec)).toThrow();
    });
  });

  describe('#validateSpecModels', () => {
    it('should pass with valid data', () => {
      const model: JSONObject = {
        default: 'python',
        kernelspecs: {
          python: PYTHON_SPEC
        }
      };
      expect(() => {
        validateSpecModels(model);
      }).not.toThrow();
    });

    it('should fail on missing data', () => {
      const model: any = {
        default: 'python'
      };
      expect(() => validateSpecModels(model)).toThrow();
    });
  });
});
