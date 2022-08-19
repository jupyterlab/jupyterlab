// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { validateModel as validateKernelModel } from '../kernel/validate';

import * as Session from './session';

import { validateProperty } from '../validate';

/**
 * Validate an `Session.IModel` object.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function validateModel(data: any): asserts data is Session.IModel {
  validateProperty(data, 'id', 'string');
  validateProperty(data, 'type', 'string');
  validateProperty(data, 'name', 'string');
  validateProperty(data, 'path', 'string');
  validateProperty(data, 'kernel', 'object');
  validateKernelModel(data.kernel);
}

/**
 * Update model from legacy session data.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function updateLegacySessionModel(data: any): void {
  if (data.path === undefined && data.notebook !== undefined) {
    data.path = data.notebook.path;
    data.type = 'notebook';
    data.name = '';
  }
}

/**
 * Validate an array of `Session.IModel` objects.
 */
export function validateModels(
  models: Session.IModel[]
): asserts models is Session.IModel[] {
  if (!Array.isArray(models)) {
    throw new Error('Invalid session list');
  }
  models.forEach(d => validateModel(d));
}
