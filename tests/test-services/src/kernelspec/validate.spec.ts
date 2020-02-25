// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { JSONObject } from '@lumino/coreutils';

import {
  validateSpecModel,
  validateSpecModels
} from '@jupyterlab/services/lib/kernelspec/validate';

import { PYTHON_SPEC } from '../utils';

describe('kernelspec/validate', () => {
  describe('#validateSpecModel', () => {
    it('should pass with valid data', () => {
      validateSpecModel(PYTHON_SPEC);
    });

    it('should fail on missing data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete spec['name'];
      expect(() => validateSpecModel(spec)).to.throw();
    });

    it('should fail on incorrect data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      spec.spec.language = 1;
      expect(() => validateSpecModel(spec)).to.throw();
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
      validateSpecModels(model);
    });

    it('should fail on missing data', () => {
      const model: any = {
        default: 'python'
      };
      expect(() => validateSpecModels(model)).to.throw();
    });
  });
});
