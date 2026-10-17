// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Terminal } from '../../src';
import { validateModel, validateModels } from '../../src/terminal/validate';

describe('terminal/validate', () => {
  describe('#validateModel()', () => {
    it('should pass a valid model', () => {
      const model: Terminal.IModel = { name: 'foo' };
      expect(() => {
        validateModel(model);
      }).not.toThrow();
    });

    it('should fail if missing name property', () => {
      const model = {};
      expect(() => {
        validateModel(model);
      }).toThrow(/Missing property 'name'/);
    });

    it('should fail if name is not a string', () => {
      const model = { name: 123 };
      expect(() => {
        validateModel(model);
      }).toThrow(/Property 'name' is not of type 'string'/);
    });

    it('should fail if model is not an object', () => {
      expect(() => {
        validateModel('foo');
      }).toThrow();
    });
  });

  describe('#validateModels()', () => {
    it('should pass a valid array of models', () => {
      const models: Terminal.IModel[] = [{ name: 'foo' }, { name: 'bar' }];
      expect(() => {
        validateModels(models);
      }).not.toThrow();
    });

    it('should fail if not an array', () => {
      expect(() => {
        validateModels({ name: 'foo' });
      }).toThrow(/Invalid terminal list/);
    });

    it('should fail if any element is invalid', () => {
      const models = [{ name: 'foo' }, { name: 123 }];
      expect(() => {
        validateModels(models);
      }).toThrow(/Property 'name' is not of type 'string'/);
    });
  });
});
