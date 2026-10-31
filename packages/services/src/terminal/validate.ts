// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IModel } from './restapi';

import { validateProperty } from '../validate';

/**
 * Validate a `Terminal.IModel` object.
 */
export function validateModel(model: unknown): asserts model is IModel {
  validateProperty(model, 'name', 'string');
}

/**
 * Validate an array of `Terminal.IModel` objects.
 */
export function validateModels(models: unknown): asserts models is IModel[] {
  if (!Array.isArray(models)) {
    throw new Error('Invalid terminal list');
  }
  models.forEach(d => validateModel(d));
}
