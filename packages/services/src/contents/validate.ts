// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Contents } from './index';
import { validateProperty } from '../validate';

/**
 * Validate an `Contents.IModel` object.
 */
export function validateContentsModel(model: Contents.IModel): void {
  validateProperty(model, 'name', 'string');
  validateProperty(model, 'path', 'string');
  validateProperty(model, 'type', 'string');
  validateProperty(model, 'created', 'string');
  validateProperty(model, 'last_modified', 'string');
  validateProperty(model, 'mimetype', 'object');
  validateProperty(model, 'content', 'object');
  validateProperty(model, 'format', 'object');
}

/**
 * Validate an `Contents.ICheckpointModel` object.
 */
export function validateCheckpointModel(
  model: Contents.ICheckpointModel
): void {
  validateProperty(model, 'id', 'string');
  validateProperty(model, 'last_modified', 'string');
}
