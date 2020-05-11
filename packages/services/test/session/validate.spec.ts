// Copyright (c) Jupyter Development Team.

import 'jest';

import { Session } from '../../src';

import {
  validateModel,
  updateLegacySessionModel
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
      validateModel(model);
    });

    it('should fail on missing data', () => {
      const model: any = {
        id: 'foo',
        kernel: { name: 'foo', id: '123' },
        path: 'bar',
        name: ''
      };
      expect(() => validateModel(model)).toThrowError();
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
      validateModel(model);
    });
  });
});
