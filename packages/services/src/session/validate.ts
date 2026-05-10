// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { validateModel as validateKernelModel } from '../kernel/validate';

import type * as Session from './session';

import { validateProperty } from '../validate';

type JSONRecord = {
  [key: string]: unknown;
};

/**
 * Validate an `Session.IModel` object.
 */
export function validateModel(
  data: JSONRecord
): asserts data is Session.IModel {
  validateProperty(data, 'id', 'string');
  validateProperty(data, 'type', 'string');
  validateProperty(data, 'name', 'string');
  validateProperty(data, 'path', 'string');
  validateProperty(data, 'kernel', 'object');
  validateKernelModel(data.kernel as Session.IModel['kernel']);
}

/**
 * Update model from legacy session data.
 */
export function updateLegacySessionModel(data: JSONRecord): void {
  const notebook = data.notebook;
  if (data.path === undefined && notebook && typeof notebook === 'object') {
    const notebookPath = (notebook as { path?: unknown }).path;
    if (typeof notebookPath === 'string') {
      data.path = notebookPath;
      data.type = 'notebook';
      data.name = '';
    }
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
