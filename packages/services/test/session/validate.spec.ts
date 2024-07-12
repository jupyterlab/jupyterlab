// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Session } from '../../src';
import {
  updateLegacySessionModel,
  validateModel
} from '../../src/session/validate';

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
      expect(() => {
        validateModel(model);
      }).not.toThrow();
    });

    it('should fail on missing data', () => {
      const model: any = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        path: 'bar',
        name: ''
      };
      expect(() => validateModel(model)).toThrow();
    });
  });

  describe('#updateLegacySessionModel()', () => {
    it('should update a deprecated model', () => {
      const model = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        notebook: {
          path: 'bar'
        }
      };
      updateLegacySessionModel(model);
      expect(() => {
        validateModel(model);
      }).not.toThrow();
    });
  });
});
